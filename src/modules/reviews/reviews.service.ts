import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { FindOptionsWhere, MoreThan, Repository } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { ReviewEntity, ReviewStatus } from '../../entities/review.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
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

    await this.sendReviewRequest(appointment, token);

    return { reviewId: review.id, token };
  }

  async submit(dto: SubmitReviewDto): Promise<SubmitReviewResult> {
    const review = await this.reviewsRepository.findOne({
      where: { requestToken: dto.token },
    });

    if (!review) {
      throw new NotFoundException('Invalid or already used review token');
    }

    if (review.rating !== NOT_RATED) {
      throw new BadRequestException('Review has already been submitted');
    }

    review.rating = dto.rating;
    review.comment = dto.comment ?? null;
    review.status = ReviewStatus.PENDING;
    review.requestToken = null;

    await this.reviewsRepository.save(review);

    return { success: true };
  }

  async findAll(
    clinicId: string,
    query: ListReviewsQueryDto,
  ): Promise<PaginatedResult<ReviewEntity>> {
    const { page, limit, status, doctorProfileId } = query;

    const where: FindOptionsWhere<ReviewEntity> = { clinicId };

    if (status !== undefined) {
      where.status = status;
    }

    if (doctorProfileId !== undefined) {
      where.doctorProfileId = doctorProfileId;
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
    appointment: AppointmentEntity,
    token: string,
  ): Promise<void> {
    const body = `Пожалуйста, оцените ваш приём. Код для отзыва: ${token}`;
    const { patient } = appointment;

    if (patient.phone) {
      await this.notificationsService.send(NotificationChannel.SMS, {
        to: patient.phone,
        body,
      });
      return;
    }

    if (patient.email) {
      await this.notificationsService.send(NotificationChannel.EMAIL, {
        to: patient.email,
        subject: 'Оцените ваш приём',
        body,
      });
    }
  }
}
