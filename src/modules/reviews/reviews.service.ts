import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { FindOptionsWhere, MoreThan, Repository } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import { findClinicAdmins } from '../../common/helpers/find-clinic-admins.helper';
import { resolveOwnDoctorProfileIdIfDoctor } from '../../common/helpers/resolve-own-doctor-profile-id.helper';
import {
  newReviewAdminCopy,
  newReviewDoctorCopy,
  reviewRequestCopy,
} from '../../common/notifications/notification-copy';
import { resolveClinicNotificationContext } from '../../common/notifications/notification-locale';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { ReviewEntity, ReviewStatus } from '../../entities/review.entity';
import { UserEntity } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { UpdateReviewFeaturedDto } from './dto/update-review-featured.dto';
import { UpdateReviewShowInBookingDto } from './dto/update-review-show-in-booking.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import {
  PaginatedResult,
  PublicReviewItem,
  ReviewRequestResult,
  SubmitReviewResult,
} from './types/reviews.types';

// Convention: rating = 0 means "requested but not rated yet".
// The ReviewEntity.rating column is NOT NULL without a default, so the
// review-request flow creates the row with rating 0 and a one-time
// requestToken; the public submit endpoint sets the real 1-5 rating.
// All patient-facing listings must filter rating > 0.
const NOT_RATED = 0;

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewsRepository: Repository<ReviewEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentsRepository: Repository<AppointmentEntity>,
    @InjectRepository(DoctorProfileEntity)
    private readonly doctorProfilesRepository: Repository<DoctorProfileEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(ClinicEntity)
    private readonly clinicsRepository: Repository<ClinicEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async requestReview(
    clinicId: string,
    appointmentId: string,
  ): Promise<ReviewRequestResult> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId, clinicId },
      relations: { patient: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Review can be requested only for completed appointments',
      );
    }

    const existing = await this.reviewsRepository.findOne({
      where: { appointmentId },
    });

    if (existing) {
      throw new ConflictException('Review for this appointment already exists');
    }

    const token = randomUUID();

    const review = await this.reviewsRepository.save(
      this.reviewsRepository.create({
        clinicId,
        appointmentId,
        patientId: appointment.patientId,
        doctorProfileId: appointment.doctorProfileId,
        rating: NOT_RATED,
        status: ReviewStatus.PENDING,
        requestToken: token,
      }),
    );

    await this.sendReviewRequest(clinicId, appointment, token);

    return { reviewId: review.id, token };
  }

  async submit(dto: SubmitReviewDto): Promise<SubmitReviewResult> {
    const review = await this.reviewsRepository.findOne({
      where: { requestToken: dto.token },
      relations: { patient: true },
    });

    if (!review) {
      throw new NotFoundException('Invalid or already used review token');
    }

    if (review.rating !== NOT_RATED) {
      throw new BadRequestException('Review has already been submitted');
    }

    review.rating = dto.rating;
    review.comment = dto.comment ?? null;
    // Rated reviews are visible to staff immediately — no manual moderation step.
    review.status = ReviewStatus.PUBLISHED;
    review.requestToken = null;

    await this.reviewsRepository.save(review);

    await this.notifyNewReview(review);

    return { success: true };
  }

  // Patient-portal counterpart to submit() — the patient is already
  // authenticated (JWT), so there's no one-time token: ownership is checked
  // directly against the appointment instead. Unlike submit(), calling this
  // again on an already-reviewed appointment EDITS it rather than rejecting.
  async submitOwnReview(
    clinicId: string,
    patientId: string,
    appointmentId: string,
    rating: number,
    comment: string | undefined,
  ): Promise<ReviewEntity> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId, clinicId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patientId !== patientId) {
      throw new ForbiddenException('This appointment does not belong to you');
    }

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        'Only completed appointments can be reviewed',
      );
    }

    const existing = await this.reviewsRepository.findOne({
      where: { appointmentId },
    });

    const review =
      existing ??
      this.reviewsRepository.create({
        clinicId,
        appointmentId,
        patientId: appointment.patientId,
        doctorProfileId: appointment.doctorProfileId,
      });

    const isNew = !existing;
    review.rating = rating;
    review.comment = comment ?? null;
    review.status = ReviewStatus.PUBLISHED;
    review.requestToken = null;

    const saved = await this.reviewsRepository.save(review);

    // Only alert staff the first time — an edit isn't a new event worth paging anyone about.
    if (isNew) {
      const withPatient = await this.reviewsRepository.findOne({
        where: { id: saved.id },
        relations: { patient: true },
      });
      if (withPatient) {
        await this.notifyNewReview(withPatient);
      }
    }

    return saved;
  }

  // Only ever the patient's own rated reviews (rating 0 = a pending staff-
  // requested token the patient hasn't rated yet — not theirs to see as "their review").
  async findMyReviews(
    clinicId: string,
    patientId: string,
  ): Promise<ReviewEntity[]> {
    return this.reviewsRepository.find({
      where: { clinicId, patientId, rating: MoreThan(NOT_RATED) },
    });
  }

  private async notifyNewReview(review: ReviewEntity): Promise<void> {
    const patientName = `${review.patient.firstName} ${review.patient.lastName}`;
    const stars = '★'.repeat(review.rating);
    const { locale, clinicName } = await resolveClinicNotificationContext(
      this.clinicsRepository,
      review.clinicId,
    );

    const doctorProfile = await this.doctorProfilesRepository.findOne({
      where: { id: review.doctorProfileId },
      relations: { user: true },
    });
    const doctorName = doctorProfile
      ? `${doctorProfile.user.firstName} ${doctorProfile.user.lastName}`
      : null;

    const sends: Promise<void>[] = [];

    if (doctorProfile) {
      sends.push(
        this.notificationsService.notifyStaffMember(doctorProfile.user, {
          ...newReviewDoctorCopy(locale, {
            patientName,
            stars,
            comment: review.comment,
          }),
          clinicName,
        }),
      );
    }

    sends.push(
      (async () => {
        const admins = await findClinicAdmins(
          this.usersRepository,
          review.clinicId,
        );
        const interested = admins.filter(
          (admin) =>
            review.rating <= admin.notificationPreferences.reviewAlertMaxRating,
        );
        await this.notificationsService.notifyStaffMembers(interested, {
          ...newReviewAdminCopy(locale, {
            patientName,
            doctorName,
            stars,
            comment: review.comment,
          }),
          clinicName,
        });
      })(),
    );

    await Promise.allSettled(sends);
  }

  async findAll(
    clinicId: string,
    query: ListReviewsQueryDto,
    user: JwtPayload,
  ): Promise<PaginatedResult<ReviewEntity>> {
    const {
      page,
      limit,
      status,
      doctorProfileId,
      patientId,
      featured,
      showInBooking,
    } = query;

    const where: FindOptionsWhere<ReviewEntity> = { clinicId };

    if (status !== undefined) {
      where.status = status;
    }

    // A doctor only ever sees their own reviews — any doctorProfileId passed
    // in the query is ignored rather than trusted.
    const ownDoctorProfileId = await resolveOwnDoctorProfileIdIfDoctor(
      this.doctorProfilesRepository,
      clinicId,
      user,
    );

    if (ownDoctorProfileId) {
      where.doctorProfileId = ownDoctorProfileId;
    } else if (doctorProfileId !== undefined) {
      where.doctorProfileId = doctorProfileId;
    }

    if (patientId !== undefined) {
      where.patientId = patientId;
    }

    if (featured !== undefined) {
      where.featured = featured;
    }

    if (showInBooking !== undefined) {
      where.showInBooking = showInBooking;
    }

    const [items, total] = await this.reviewsRepository.findAndCount({
      where,
      relations: {
        patient: true,
        doctorProfile: { user: true },
        appointment: true,
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async updateStatus(
    clinicId: string,
    id: string,
    dto: UpdateReviewStatusDto,
  ): Promise<ReviewEntity> {
    const review = await this.reviewsRepository.findOne({
      where: { id, clinicId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.rating === NOT_RATED && dto.status === ReviewStatus.PUBLISHED) {
      throw new BadRequestException('Cannot publish a review without a rating');
    }

    review.status = dto.status;

    // Only published reviews are eligible to be featured/shown in booking — unpublishing drops both.
    if (dto.status !== ReviewStatus.PUBLISHED) {
      review.featured = false;
      review.showInBooking = false;
    }

    return this.reviewsRepository.save(review);
  }

  async updateFeatured(
    clinicId: string,
    id: string,
    dto: UpdateReviewFeaturedDto,
  ): Promise<ReviewEntity> {
    const review = await this.reviewsRepository.findOne({
      where: { id, clinicId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (dto.featured && review.rating === NOT_RATED) {
      throw new BadRequestException('Only rated reviews can be featured');
    }

    review.featured = dto.featured;
    return this.reviewsRepository.save(review);
  }

  async updateShowInBooking(
    clinicId: string,
    id: string,
    dto: UpdateReviewShowInBookingDto,
  ): Promise<ReviewEntity> {
    const review = await this.reviewsRepository.findOne({
      where: { id, clinicId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (dto.showInBooking && review.rating === NOT_RATED) {
      throw new BadRequestException(
        'Only rated reviews can be shown in online booking',
      );
    }

    review.showInBooking = dto.showInBooking;
    return this.reviewsRepository.save(review);
  }

  async findPublic(
    clinicId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<PublicReviewItem>> {
    const { page, limit } = query;

    const [reviews, total] = await this.reviewsRepository.findAndCount({
      where: {
        clinicId,
        status: ReviewStatus.PUBLISHED,
        rating: MoreThan(NOT_RATED),
        featured: true,
      },
      relations: { patient: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items = reviews.map((review): PublicReviewItem => ({
      rating: review.rating,
      comment: review.comment,
      patientName: this.formatPatientName(
        review.patient.firstName,
        review.patient.lastName,
      ),
      createdAt: review.createdAt,
    }));

    return { items, total, page, limit };
  }

  private formatPatientName(firstName: string, lastName: string): string {
    const initial = lastName.trim().charAt(0);
    return initial ? `${firstName} ${initial.toUpperCase()}.` : firstName;
  }

  private async sendReviewRequest(
    clinicId: string,
    appointment: AppointmentEntity,
    token: string,
  ): Promise<void> {
    const { locale, clinicName } = await resolveClinicNotificationContext(
      this.clinicsRepository,
      clinicId,
    );
    const { subject, body } = reviewRequestCopy(locale, { token });
    const { patient } = appointment;
    const prefs = patient.notificationPreferences;

    const wantsWhatsapp = prefs?.whatsapp ?? true;
    const wantsEmail = prefs?.email ?? true;

    if (wantsWhatsapp && patient.phone) {
      await this.notificationsService.send(NotificationChannel.WHATSAPP, {
        to: patient.phone,
        body,
      });
    }

    if (wantsEmail && patient.email) {
      await this.notificationsService.send(NotificationChannel.EMAIL, {
        to: patient.email,
        subject,
        body,
        clinicName,
      });
    }
  }
}
