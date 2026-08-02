import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LessThanOrEqual,
  MoreThanOrEqual,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { findClinicAdmins } from '../../common/helpers/find-clinic-admins.helper';
import { resolveOwnDoctorProfileIdIfDoctor } from '../../common/helpers/resolve-own-doctor-profile-id.helper';
import {
  appointmentArrivedCopy,
  appointmentCancelledAdminCopy,
  appointmentCancelledDoctorCopy,
  appointmentCancelledPatientCopy,
  appointmentRescheduledDoctorCopy,
  appointmentRescheduledPatientCopy,
} from '../../common/notifications/notification-copy';
import {
  NOTIFICATION_LOCALE_INTL_TAG,
  resolveClinicNotificationContext,
  type NotificationLocale,
} from '../../common/notifications/notification-locale';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import {
  AppointmentEntity,
  AppointmentSource,
} from '../../entities/appointment.entity';
import { BranchEntity } from '../../entities/branch.entity';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { DoctorScheduleEntity } from '../../entities/doctor-schedule.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ReminderEntity, ReminderStatus } from '../../entities/reminder.entity';
import { ScheduleExceptionEntity } from '../../entities/schedule-exception.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { UserEntity } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

const MAX_RANGE_DAYS = 62;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

// Postgres error code for a violated EXCLUDE constraint — the last-resort
// guard against two concurrent requests both passing findConflict().
const POSTGRES_EXCLUSION_VIOLATION = '23P01';

// Statuses that free up the slot for other bookings
const NON_BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];

// No further status transitions allowed from these
const TERMINAL_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.NO_SHOW,
];

const toMinutesOfDay = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// 0 = Monday ... 6 = Sunday, matching DoctorScheduleEntity.weekday
// (JS Date#getDay: 0 = Sunday).
const weekdayOf = (date: Date): number => (date.getDay() + 6) % 7;

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(AppointmentEntity)
    private readonly appointmentsRepository: Repository<AppointmentEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
    @InjectRepository(DoctorProfileEntity)
    private readonly doctorProfilesRepository: Repository<DoctorProfileEntity>,
    @InjectRepository(ServiceEntity)
    private readonly servicesRepository: Repository<ServiceEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchesRepository: Repository<BranchEntity>,
    @InjectRepository(CabinetEntity)
    private readonly cabinetsRepository: Repository<CabinetEntity>,
    @InjectRepository(ReminderEntity)
    private readonly remindersRepository: Repository<ReminderEntity>,
    @InjectRepository(DoctorScheduleEntity)
    private readonly doctorSchedulesRepository: Repository<DoctorScheduleEntity>,
    @InjectRepository(ScheduleExceptionEntity)
    private readonly scheduleExceptionsRepository: Repository<ScheduleExceptionEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(ClinicEntity)
    private readonly clinicsRepository: Repository<ClinicEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findMany(
    clinicId: string,
    query: QueryAppointmentsDto,
    user: JwtPayload,
  ): Promise<AppointmentEntity[]> {
    const ownDoctorProfileId = await resolveOwnDoctorProfileIdIfDoctor(
      this.doctorProfilesRepository,
      clinicId,
      user,
    );

    const from = new Date(query.from);
    const to = new Date(query.to);

    if (to <= from) {
      throw new BadRequestException('"to" must be later than "from"');
    }

    if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * MS_PER_DAY) {
      throw new BadRequestException(
        `Date range must not exceed ${MAX_RANGE_DAYS} days`,
      );
    }

    const qb = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('appointment.doctorProfile', 'doctorProfile')
      .leftJoinAndSelect('doctorProfile.user', 'doctorUser')
      .leftJoinAndSelect('appointment.service', 'service')
      .leftJoinAndSelect('appointment.cabinet', 'cabinet')
      .where('appointment.clinicId = :clinicId', { clinicId })
      .andWhere('appointment.startsAt < :to', { to })
      .andWhere('appointment.endsAt > :from', { from })
      .orderBy('appointment.startsAt', 'ASC');

    if (ownDoctorProfileId) {
      // A doctor only ever sees their own appointments — any doctorProfileId
      // passed in the query is ignored rather than trusted.
      qb.andWhere('appointment.doctorProfileId = :ownDoctorProfileId', {
        ownDoctorProfileId,
      });
    } else if (query.doctorProfileId) {
      qb.andWhere('appointment.doctorProfileId = :doctorProfileId', {
        doctorProfileId: query.doctorProfileId,
      });
    }

    if (query.branchId) {
      qb.andWhere('appointment.branchId = :branchId', {
        branchId: query.branchId,
      });
    }

    if (query.status) {
      qb.andWhere('appointment.status = :status', { status: query.status });
    }

    if (query.patientId) {
      qb.andWhere('appointment.patientId = :patientId', {
        patientId: query.patientId,
      });
    }

    return qb.getMany();
  }

  // `user` is only passed from the controller's own GET :id route — internal
  // callers (create/reschedule/update/updateStatus fetching the record they
  // just touched) omit it and stay unscoped.
  async findOne(
    clinicId: string,
    id: string,
    user?: JwtPayload,
  ): Promise<AppointmentEntity> {
    const ownDoctorProfileId = user
      ? await resolveOwnDoctorProfileIdIfDoctor(
          this.doctorProfilesRepository,
          clinicId,
          user,
        )
      : null;

    const appointment = await this.appointmentsRepository.findOne({
      where: {
        id,
        clinicId,
        ...(ownDoctorProfileId ? { doctorProfileId: ownDoctorProfileId } : {}),
      },
      relations: {
        patient: true,
        doctorProfile: { user: true },
        service: true,
        cabinet: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async create(
    clinicId: string,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentEntity> {
    const [service] = await Promise.all([
      this.getOwnedService(clinicId, dto.serviceId),
      this.getOwnedPatient(clinicId, dto.patientId),
      this.getOwnedDoctorProfile(clinicId, dto.doctorProfileId),
      this.getOwnedBranch(clinicId, dto.branchId),
      dto.cabinetId
        ? this.getOwnedCabinet(clinicId, dto.cabinetId)
        : Promise.resolve(null),
    ]);

    if (dto.durationMinutes !== undefined && dto.durationMinutes % 15 !== 0) {
      throw new BadRequestException('durationMinutes must be a multiple of 15');
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = this.computeEndsAt(
      startsAt,
      dto.durationMinutes ?? service.durationMinutes,
    );

    await this.assertWithinWorkingHours(
      dto.doctorProfileId,
      dto.branchId,
      startsAt,
      endsAt,
    );

    await this.assertNoConflict(
      clinicId,
      dto.doctorProfileId,
      dto.cabinetId ?? null,
      startsAt,
      endsAt,
    );

    const appointment = this.appointmentsRepository.create({
      clinicId,
      branchId: dto.branchId,
      doctorProfileId: dto.doctorProfileId,
      patientId: dto.patientId,
      serviceId: dto.serviceId,
      cabinetId: dto.cabinetId ?? null,
      startsAt,
      endsAt,
      status: AppointmentStatus.CONFIRMED,
      source: AppointmentSource.RECEPTION,
      price: service.price,
      comment: dto.comment ?? null,
    });

    const saved = await this.saveAppointment(appointment);

    return this.findOne(clinicId, saved.id);
  }

  async reschedule(
    clinicId: string,
    id: string,
    dto: RescheduleAppointmentDto,
  ): Promise<AppointmentEntity> {
    const appointment = await this.getOwned(clinicId, id);
    const service = await this.getOwnedService(clinicId, appointment.serviceId);

    if (
      dto.doctorProfileId &&
      dto.doctorProfileId !== appointment.doctorProfileId
    ) {
      await this.getOwnedDoctorProfile(clinicId, dto.doctorProfileId);
    }

    if (dto.branchId && dto.branchId !== appointment.branchId) {
      await this.getOwnedBranch(clinicId, dto.branchId);
    }

    if (dto.cabinetId && dto.cabinetId !== appointment.cabinetId) {
      await this.getOwnedCabinet(clinicId, dto.cabinetId);
    }

    const doctorProfileId = dto.doctorProfileId ?? appointment.doctorProfileId;
    const cabinetId = dto.cabinetId ?? appointment.cabinetId;
    const branchId = dto.branchId ?? appointment.branchId;
    const startsAt = new Date(dto.startsAt);
    const endsAt = this.computeEndsAt(startsAt, service.durationMinutes);

    await this.assertWithinWorkingHours(
      doctorProfileId,
      branchId,
      startsAt,
      endsAt,
    );

    await this.assertNoConflict(
      clinicId,
      doctorProfileId,
      cabinetId,
      startsAt,
      endsAt,
      appointment.id,
    );

    const previousStartsAt = appointment.startsAt;

    appointment.doctorProfileId = doctorProfileId;
    appointment.cabinetId = cabinetId;
    appointment.branchId = branchId;
    appointment.startsAt = startsAt;
    appointment.endsAt = endsAt;

    await this.saveAppointment(appointment);

    const updated = await this.findOne(clinicId, id);
    await this.notifyRescheduled(clinicId, updated, previousStartsAt);

    return updated;
  }

  async updateStatus(
    clinicId: string,
    id: string,
    dto: UpdateAppointmentStatusDto,
  ): Promise<AppointmentEntity> {
    const appointment = await this.getOwned(clinicId, id);

    if (TERMINAL_STATUSES.includes(appointment.status)) {
      throw new BadRequestException(
        `Cannot change status of a "${appointment.status}" appointment`,
      );
    }

    if (dto.status === AppointmentStatus.CANCELLED && !dto.cancellationReason) {
      throw new BadRequestException(
        'cancellationReason is required when cancelling an appointment',
      );
    }

    const previousStatus = appointment.status;
    appointment.status = dto.status;

    if (dto.status === AppointmentStatus.CANCELLED) {
      appointment.cancellationReason = dto.cancellationReason ?? null;
      await this.remindersRepository.update(
        { appointmentId: appointment.id, status: ReminderStatus.PENDING },
        { status: ReminderStatus.CANCELLED },
      );
    }

    await this.appointmentsRepository.save(appointment);

    const updated = await this.findOne(clinicId, id);
    await this.notifyStatusChange(clinicId, updated, previousStatus);

    return updated;
  }

  private formatDateTime(date: Date, locale: NotificationLocale): string {
    return date.toLocaleString(NOTIFICATION_LOCALE_INTL_TAG[locale], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private async notifyStatusChange(
    clinicId: string,
    appointment: AppointmentEntity,
    previousStatus: AppointmentStatus,
  ): Promise<void> {
    if (appointment.status === previousStatus) {
      return;
    }

    const { patient, doctorProfile, service } = appointment;
    const doctorName = `${doctorProfile.user.firstName} ${doctorProfile.user.lastName}`;
    const patientName = `${patient.firstName} ${patient.lastName}`;
    const { locale, clinicName } = await resolveClinicNotificationContext(
      this.clinicsRepository,
      clinicId,
    );
    const when = this.formatDateTime(appointment.startsAt, locale);

    if (appointment.status === AppointmentStatus.ARRIVED) {
      await this.notificationsService.notifyStaffMember(doctorProfile.user, {
        ...appointmentArrivedCopy(locale, {
          patientName,
          serviceName: service.name,
          when,
        }),
        clinicName,
      });
      return;
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      await Promise.allSettled([
        this.notificationsService.notifyPatient(patient, {
          ...appointmentCancelledPatientCopy(locale, {
            serviceName: service.name,
            when,
          }),
          clinicName,
        }),
        this.notificationsService.notifyStaffMember(doctorProfile.user, {
          ...appointmentCancelledDoctorCopy(locale, {
            patientName,
            serviceName: service.name,
            when,
          }),
          clinicName,
        }),
        (async () => {
          const admins = await findClinicAdmins(this.usersRepository, clinicId);
          await this.notificationsService.notifyStaffMembers(admins, {
            ...appointmentCancelledAdminCopy(locale, {
              patientName,
              doctorName,
              serviceName: service.name,
              when,
            }),
            clinicName,
          });
        })(),
      ]);
    }
  }

  private async notifyRescheduled(
    clinicId: string,
    appointment: AppointmentEntity,
    previousStartsAt: Date,
  ): Promise<void> {
    if (previousStartsAt.getTime() === appointment.startsAt.getTime()) {
      return;
    }

    const { patient, doctorProfile, service } = appointment;
    const patientName = `${patient.firstName} ${patient.lastName}`;
    const { locale, clinicName } = await resolveClinicNotificationContext(
      this.clinicsRepository,
      clinicId,
    );
    const previousWhen = this.formatDateTime(previousStartsAt, locale);
    const nextWhen = this.formatDateTime(appointment.startsAt, locale);

    await Promise.allSettled([
      this.notificationsService.notifyPatient(patient, {
        ...appointmentRescheduledPatientCopy(locale, {
          serviceName: service.name,
          previousWhen,
          nextWhen,
        }),
        clinicName,
      }),
      this.notificationsService.notifyStaffMember(doctorProfile.user, {
        ...appointmentRescheduledDoctorCopy(locale, {
          patientName,
          serviceName: service.name,
          previousWhen,
          nextWhen,
        }),
        clinicName,
      }),
    ]);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateAppointmentDto,
  ): Promise<AppointmentEntity> {
    const appointment = await this.getOwned(clinicId, id);

    if (dto.patientId && dto.patientId !== appointment.patientId) {
      await this.getOwnedPatient(clinicId, dto.patientId);
      appointment.patientId = dto.patientId;
    }

    if (dto.serviceId && dto.serviceId !== appointment.serviceId) {
      const service = await this.getOwnedService(clinicId, dto.serviceId);
      const endsAt = this.computeEndsAt(
        appointment.startsAt,
        service.durationMinutes,
      );

      await this.assertWithinWorkingHours(
        appointment.doctorProfileId,
        appointment.branchId,
        appointment.startsAt,
        endsAt,
      );

      await this.assertNoConflict(
        clinicId,
        appointment.doctorProfileId,
        appointment.cabinetId,
        appointment.startsAt,
        endsAt,
        appointment.id,
      );

      appointment.serviceId = dto.serviceId;
      appointment.endsAt = endsAt;
      appointment.price = service.price;
    }

    if (dto.comment !== undefined) {
      appointment.comment = dto.comment;
    }

    await this.saveAppointment(appointment);

    return this.findOne(clinicId, id);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const appointment = await this.getOwned(clinicId, id);
    await this.appointmentsRepository.softRemove(appointment);
  }

  private async getOwned(
    clinicId: string,
    id: string,
  ): Promise<AppointmentEntity> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id, clinicId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  private async getOwnedPatient(
    clinicId: string,
    id: string,
  ): Promise<PatientEntity> {
    const patient = await this.patientsRepository.findOne({
      where: { id, clinicId },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found in this clinic');
    }

    return patient;
  }

  private async getOwnedDoctorProfile(
    clinicId: string,
    id: string,
  ): Promise<DoctorProfileEntity> {
    const doctorProfile = await this.doctorProfilesRepository.findOne({
      where: { id, clinicId },
    });

    if (!doctorProfile) {
      throw new BadRequestException('Doctor profile not found in this clinic');
    }

    return doctorProfile;
  }

  private async getOwnedService(
    clinicId: string,
    id: string,
  ): Promise<ServiceEntity> {
    const service = await this.servicesRepository.findOne({
      where: { id, clinicId },
    });

    if (!service) {
      throw new BadRequestException('Service not found in this clinic');
    }

    return service;
  }

  private async getOwnedBranch(
    clinicId: string,
    id: string,
  ): Promise<BranchEntity> {
    const branch = await this.branchesRepository.findOne({
      where: { id, clinicId },
    });

    if (!branch) {
      throw new BadRequestException('Branch not found in this clinic');
    }

    return branch;
  }

  private async getOwnedCabinet(
    clinicId: string,
    id: string,
  ): Promise<CabinetEntity> {
    const cabinet = await this.cabinetsRepository.findOne({
      where: { id, branch: { clinicId } },
    });

    if (!cabinet) {
      throw new BadRequestException('Cabinet not found in this clinic');
    }

    return cabinet;
  }

  private computeEndsAt(startsAt: Date, durationMinutes: number): Date {
    return new Date(startsAt.getTime() + durationMinutes * MS_PER_MINUTE);
  }

  private async assertWithinWorkingHours(
    doctorProfileId: string,
    branchId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<void> {
    const schedule = await this.doctorSchedulesRepository.findOne({
      where: { doctorProfileId, branchId, weekday: weekdayOf(startsAt) },
    });

    // Minutes since local midnight of startsAt's own calendar day — endMinutes
    // exceeds 1440 (and so always fails) if the appointment spans past midnight.
    const dayStart = new Date(startsAt);
    dayStart.setHours(0, 0, 0, 0);
    const startMinutes = Math.round(
      (startsAt.getTime() - dayStart.getTime()) / MS_PER_MINUTE,
    );
    const endMinutes = Math.round(
      (endsAt.getTime() - dayStart.getTime()) / MS_PER_MINUTE,
    );

    const fitsSchedule =
      schedule !== null &&
      startMinutes >= toMinutesOfDay(schedule.startTime) &&
      endMinutes <= toMinutesOfDay(schedule.endTime);

    if (!fitsSchedule) {
      throw new BadRequestException({
        message: "Appointment is outside the doctor's working hours",
        code: 'OUTSIDE_WORKING_HOURS',
      });
    }

    const date = formatLocalDate(startsAt);
    const isDayOff = await this.scheduleExceptionsRepository.exists({
      where: {
        doctorProfileId,
        dateFrom: LessThanOrEqual(date),
        dateTo: MoreThanOrEqual(date),
      },
    });

    if (isDayOff) {
      throw new BadRequestException({
        message: 'Doctor is not working on this date',
        code: 'DOCTOR_DAY_OFF',
      });
    }
  }

  // findConflict() is a SELECT-then-INSERT check, so it can't stop two
  // concurrent requests from both passing it for the same slot. The DB-level
  // EXCLUDE constraint on (doctorProfileId, period) is the actual guarantee;
  // this turns its violation into the same 409 the pre-check produces.
  private async saveAppointment(
    appointment: AppointmentEntity,
  ): Promise<AppointmentEntity> {
    try {
      return await this.appointmentsRepository.save(appointment);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as unknown as { code?: string }).code ===
          POSTGRES_EXCLUSION_VIOLATION
      ) {
        throw new ConflictException(
          'Doctor already has an appointment in this time slot',
        );
      }

      throw err;
    }
  }

  private async assertNoConflict(
    clinicId: string,
    doctorProfileId: string,
    cabinetId: string | null,
    startsAt: Date,
    endsAt: Date,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.findConflict(
      clinicId,
      doctorProfileId,
      cabinetId,
      startsAt,
      endsAt,
      excludeId,
    );

    if (!conflict) {
      return;
    }

    if (conflict.doctorProfileId === doctorProfileId) {
      throw new ConflictException(
        'Doctor already has an appointment in this time slot',
      );
    }

    throw new ConflictException(
      'Cabinet is already occupied in this time slot',
    );
  }

  private findConflict(
    clinicId: string,
    doctorProfileId: string,
    cabinetId: string | null,
    startsAt: Date,
    endsAt: Date,
    excludeId?: string,
  ): Promise<AppointmentEntity | null> {
    const qb = this.appointmentsRepository
      .createQueryBuilder('appointment')
      .where('appointment.clinicId = :clinicId', { clinicId })
      .andWhere('appointment.status NOT IN (:...nonBlockingStatuses)', {
        nonBlockingStatuses: NON_BLOCKING_STATUSES,
      })
      .andWhere('appointment.startsAt < :endsAt', { endsAt })
      .andWhere('appointment.endsAt > :startsAt', { startsAt });

    if (cabinetId) {
      qb.andWhere(
        '(appointment.doctorProfileId = :doctorProfileId OR appointment.cabinetId = :cabinetId)',
        { doctorProfileId, cabinetId },
      );
    } else {
      qb.andWhere('appointment.doctorProfileId = :doctorProfileId', {
        doctorProfileId,
      });
    }

    if (excludeId) {
      qb.andWhere('appointment.id != :excludeId', { excludeId });
    }

    return qb.getOne();
  }
}
