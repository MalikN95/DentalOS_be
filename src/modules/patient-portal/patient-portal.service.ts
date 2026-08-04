import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { newPatientPortalMessageCopy } from '../../common/notifications/notification-copy';
import { resolveClinicNotificationContext } from '../../common/notifications/notification-locale';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ReviewEntity } from '../../entities/review.entity';
import { UserEntity } from '../../entities/user.entity';
import { AppointmentsService } from '../appointments/appointments.service';
import { AvailabilityService } from '../booking/availability.service';
import { BookingService } from '../booking/booking.service';
import { BookForPatientDto } from '../booking/dto/book-for-patient.dto';
import { BookingBranchDto } from '../booking/dto/booking-branch.dto';
import { BookingConfirmationDto } from '../booking/dto/booking-confirmation.dto';
import { BookingDoctorDto } from '../booking/dto/booking-doctor.dto';
import { BookingDoctorsQueryDto } from '../booking/dto/booking-doctors-query.dto';
import { BookingServiceCategoryDto } from '../booking/dto/booking-service-category.dto';
import { ChatService } from '../chat/chat.service';
import { PaginationQueryDto } from '../chat/dto/pagination-query.dto';
import { PatientMessageSummary } from '../chat/types/chat.types';
import { PaginatedResult } from '../chat/types/paginated-result.type';
import { NotificationsService } from '../notifications/notifications.service';
import { ReviewsService } from '../reviews/reviews.service';
import {
  PatientPortalAppointmentScope,
  PatientPortalAppointmentSummary,
  PatientPortalProfile,
} from './types/patient-portal.types';

// Front-desk audience for a patient's incoming message — the roles who
// actually reply from the staff Chats page, not the full staff roster.
const MESSAGE_RECIPIENT_ROLES = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.RECEPTIONIST,
] as const;

const MESSAGE_PREVIEW_LENGTH = 140;

// Only these can still be cancelled by the patient themselves — once a
// visit is underway or finished, cancellation is a staff-only action.
const PATIENT_CANCELLABLE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

@Injectable()
export class PatientPortalService {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentsRepository: Repository<AppointmentEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(ClinicEntity)
    private readonly clinicsRepository: Repository<ClinicEntity>,
    private readonly appointmentsService: AppointmentsService,
    private readonly chatService: ChatService,
    private readonly reviewsService: ReviewsService,
    private readonly notificationsService: NotificationsService,
    private readonly bookingService: BookingService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async resolveOwnPatient(
    clinicId: string,
    userId: string,
  ): Promise<PatientEntity> {
    const patient = await this.patientsRepository.findOne({
      where: { clinicId, userId },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    return patient;
  }

  async getProfile(
    clinicId: string,
    userId: string,
  ): Promise<PatientPortalProfile> {
    const patient = await this.resolveOwnPatient(clinicId, userId);

    return {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email,
    };
  }

  async listAppointments(
    clinicId: string,
    userId: string,
    scope: PatientPortalAppointmentScope,
  ): Promise<PatientPortalAppointmentSummary[]> {
    const patient = await this.resolveOwnPatient(clinicId, userId);
    const now = new Date();

    const qb = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('appointment.doctorProfile', 'doctorProfile')
      .leftJoinAndSelect('doctorProfile.user', 'doctor')
      .leftJoinAndSelect('appointment.branch', 'branch')
      .where('appointment.clinicId = :clinicId', { clinicId })
      .andWhere('appointment.patientId = :patientId', {
        patientId: patient.id,
      });

    if (scope === 'upcoming') {
      qb.andWhere('appointment.startsAt >= :now', { now }).orderBy(
        'appointment.startsAt',
        'ASC',
      );
    } else {
      qb.andWhere('appointment.startsAt < :now', { now }).orderBy(
        'appointment.startsAt',
        'DESC',
      );
    }

    const appointments = await qb.getMany();

    return appointments.map((appointment) =>
      this.toAppointmentSummary(appointment, now, userId),
    );
  }

  async cancelAppointment(
    clinicId: string,
    userId: string,
    appointmentId: string,
    reason: string | undefined,
  ): Promise<PatientPortalAppointmentSummary> {
    const patient = await this.resolveOwnPatient(clinicId, userId);

    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId, clinicId },
      relations: { service: true, doctorProfile: { user: true }, branch: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException('This appointment does not belong to you');
    }

    if (!PATIENT_CANCELLABLE_STATUSES.includes(appointment.status)) {
      throw new BadRequestException(
        `Cannot cancel an appointment with status "${appointment.status}"`,
      );
    }

    if (appointment.startsAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Cannot cancel an appointment that has already started',
      );
    }

    const cancellationReason = reason?.trim() || 'Cancelled by patient';

    // AppointmentsService.updateStatus's own return value doesn't carry the
    // `branch` relation (its internal findOne() only loads patient/doctorProfile/
    // service/cabinet) — reuse the already-loaded `appointment` above instead of
    // building the summary off an entity that would render with a blank branch.
    await this.appointmentsService.updateStatus(
      clinicId,
      appointmentId,
      { status: AppointmentStatus.CANCELLED, cancellationReason },
      userId,
    );

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancellationReason = cancellationReason;
    appointment.cancelledByUserId = userId;

    return this.toAppointmentSummary(appointment, new Date(), userId);
  }

  async listMessages(
    clinicId: string,
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<PatientMessageSummary>> {
    const patient = await this.resolveOwnPatient(clinicId, userId);

    return this.chatService.listPatientMessages(clinicId, patient.id, query);
  }

  async sendMessage(
    clinicId: string,
    userId: string,
    body: string,
  ): Promise<PatientMessageSummary> {
    const patient = await this.resolveOwnPatient(clinicId, userId);

    const message = await this.chatService.receivePatientMessage({
      clinicId,
      patientId: patient.id,
      body,
    });

    // Best-effort: a failed staff alert must never fail the patient's send,
    // which already succeeded (the message is already saved above).
    this.notifyStaffOfMessage(clinicId, patient, body).catch(() => undefined);

    return message;
  }

  async listMyReviews(
    clinicId: string,
    userId: string,
  ): Promise<ReviewEntity[]> {
    const patient = await this.resolveOwnPatient(clinicId, userId);

    return this.reviewsService.findMyReviews(clinicId, patient.id);
  }

  async submitReview(
    clinicId: string,
    userId: string,
    appointmentId: string,
    rating: number,
    comment: string | undefined,
  ): Promise<ReviewEntity> {
    const patient = await this.resolveOwnPatient(clinicId, userId);

    return this.reviewsService.submitOwnReview(
      clinicId,
      patient.id,
      appointmentId,
      rating,
      comment,
    );
  }

  // Booking, read side — thin pass-throughs to the same BookingService/
  // AvailabilityService the public /book/:clinicSlug widget uses, just
  // resolved from the JWT's clinicId instead of a slug lookup.
  getBookingBranches(clinicId: string): Promise<BookingBranchDto[]> {
    return this.bookingService.getBranches(clinicId);
  }

  getBookingServices(clinicId: string): Promise<BookingServiceCategoryDto[]> {
    return this.bookingService.getServices(clinicId);
  }

  getBookingDoctors(
    clinicId: string,
    query: BookingDoctorsQueryDto,
  ): Promise<BookingDoctorDto[]> {
    return this.bookingService.getDoctors(clinicId, query);
  }

  getBookingDays(
    clinicId: string,
    doctorProfileId: string,
    serviceId: string,
    branchId: string,
    month: string,
  ): Promise<string[]> {
    return this.availabilityService.getAvailableDays(
      { clinicId, doctorProfileId, serviceId, branchId },
      month,
    );
  }

  getBookingSlots(
    clinicId: string,
    doctorProfileId: string,
    serviceId: string,
    branchId: string,
    date: string,
  ): Promise<string[]> {
    return this.availabilityService.getAvailableSlots(
      { clinicId, doctorProfileId, serviceId, branchId },
      date,
    );
  }

  async bookAppointment(
    clinic: ClinicEntity,
    userId: string,
    dto: BookForPatientDto,
  ): Promise<BookingConfirmationDto> {
    const patient = await this.resolveOwnPatient(clinic.id, userId);

    return this.bookingService.bookForPatient(clinic, patient.id, dto);
  }

  private async notifyStaffOfMessage(
    clinicId: string,
    patient: PatientEntity,
    body: string,
  ): Promise<void> {
    const recipients = await this.usersRepository.find({
      where: {
        clinicId,
        role: In(MESSAGE_RECIPIENT_ROLES),
        isActive: true,
      },
    });

    if (recipients.length === 0) {
      return;
    }

    const { locale, clinicName } = await resolveClinicNotificationContext(
      this.clinicsRepository,
      clinicId,
    );

    await this.notificationsService.notifyStaffMembers(recipients, {
      ...newPatientPortalMessageCopy(locale, {
        patientName: `${patient.firstName} ${patient.lastName}`,
        preview:
          body.length > MESSAGE_PREVIEW_LENGTH
            ? `${body.slice(0, MESSAGE_PREVIEW_LENGTH)}…`
            : body,
      }),
      clinicName,
    });
  }

  private toAppointmentSummary(
    appointment: AppointmentEntity,
    now: Date,
    ownUserId?: string,
  ): PatientPortalAppointmentSummary {
    return {
      id: appointment.id,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: appointment.status,
      serviceName: appointment.service?.name ?? '',
      doctorName: appointment.doctorProfile?.user
        ? `${appointment.doctorProfile.user.firstName} ${appointment.doctorProfile.user.lastName}`
        : '',
      branchName: appointment.branch?.name ?? '',
      price: appointment.price,
      comment: appointment.comment,
      cancellationReason: appointment.cancellationReason,
      cancelledBy: this.resolveCancelledBy(
        appointment.cancelledByUserId,
        ownUserId,
      ),
      isCancellable:
        PATIENT_CANCELLABLE_STATUSES.includes(appointment.status) &&
        appointment.startsAt.getTime() > now.getTime(),
    };
  }

  private resolveCancelledBy(
    cancelledByUserId: string | null,
    ownUserId: string | undefined,
  ): 'patient' | 'staff' | null {
    if (!cancelledByUserId) {
      return null;
    }

    return cancelledByUserId === ownUserId ? 'patient' : 'staff';
  }
}
