import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import { findClinicAdmins } from '../../common/helpers/find-clinic-admins.helper';
import {
  bookingCreatedCopy,
  newBookingAdminCopy,
  newBookingDoctorCopy,
} from '../../common/notifications/notification-copy';
import { resolveNotificationLocale } from '../../common/notifications/notification-locale';
import {
  AppointmentEntity,
  AppointmentSource,
} from '../../entities/appointment.entity';
import { BranchEntity } from '../../entities/branch.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { LeadEntity, LeadStage } from '../../entities/lead.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ReminderSettingEntity } from '../../entities/reminder-setting.entity';
import { ReminderEntity, ReminderStatus } from '../../entities/reminder.entity';
import { ReviewEntity } from '../../entities/review.entity';
import { ServiceCategoryEntity } from '../../entities/service-category.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { UserEntity } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import {
  AvailabilityParams,
  AvailabilityService,
} from './availability.service';
import { BookForPatientDto } from './dto/book-for-patient.dto';
import { BookingBranchDto } from './dto/booking-branch.dto';
import { BookingClinicDto } from './dto/booking-clinic.dto';
import { BookingConfirmationDto } from './dto/booking-confirmation.dto';
import { BookingDoctorDto } from './dto/booking-doctor.dto';
import { BookingDoctorsQueryDto } from './dto/booking-doctors-query.dto';
import {
  BookingServiceCategoryDto,
  BookingServiceDto,
} from './dto/booking-service-category.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

const MINUTE_MS = 60 * 1000;
const LEAD_SOURCE_ONLINE_BOOKING = 'online_booking';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(ServiceCategoryEntity)
    private readonly categoryRepository: Repository<ServiceCategoryEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(DoctorProfileEntity)
    private readonly doctorRepository: Repository<DoctorProfileEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly availabilityService: AvailabilityService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

  async getClinicInfo(clinic: ClinicEntity): Promise<BookingClinicDto> {
    return {
      name: clinic.name,
      logoUrl: clinic.logoKey
        ? await this.storageService.getDownloadUrl(clinic.logoKey)
        : null,
      currency: clinic.currency,
    };
  }

  async getBranches(clinicId: string): Promise<BookingBranchDto[]> {
    const branches = await this.branchRepository.find({
      where: { clinicId, isActive: true },
      order: { name: 'ASC' },
    });

    return branches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      latitude: branch.latitude,
      longitude: branch.longitude,
      workingHours: branch.workingHours,
    }));
  }

  async getServices(clinicId: string): Promise<BookingServiceCategoryDto[]> {
    const [categories, services] = await Promise.all([
      this.categoryRepository.find({
        where: { clinicId, isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
      }),
      this.serviceRepository.find({
        where: { clinicId, isActive: true, acceptsOnlineBooking: true },
        order: { name: 'ASC' },
      }),
    ]);

    const servicesByCategory = new Map<string | null, BookingServiceDto[]>();

    services.forEach((service) => {
      const list = servicesByCategory.get(service.categoryId) ?? [];
      list.push(this.toServiceDto(service));
      servicesByCategory.set(service.categoryId, list);
    });

    const knownCategoryIds = new Set(categories.map((category) => category.id));
    const result: BookingServiceCategoryDto[] = categories.map((category) => ({
      id: category.id,
      name: category.name,
      services: servicesByCategory.get(category.id) ?? [],
    }));

    // Services without a category (or with an inactive one) land in a null bucket.
    const uncategorized: BookingServiceDto[] = [];

    servicesByCategory.forEach((list, categoryId) => {
      if (categoryId === null || !knownCategoryIds.has(categoryId)) {
        uncategorized.push(...list);
      }
    });

    if (uncategorized.length > 0) {
      result.push({ id: null, name: null, services: uncategorized });
    }

    return result;
  }

  async getDoctors(
    clinicId: string,
    query: BookingDoctorsQueryDto,
  ): Promise<BookingDoctorDto[]> {
    const { serviceId } = query;

    // The widget no longer asks the patient to pick a branch, so a doctor is
    // only bookable here if they have one resolved branch to schedule at.
    const doctors = await this.doctorRepository
      .createQueryBuilder('doctor')
      .innerJoin('doctor.services', 'service', 'service.id = :serviceId', {
        serviceId,
      })
      .innerJoinAndSelect('doctor.user', 'user')
      .where('doctor.clinicId = :clinicId', { clinicId })
      .andWhere('doctor.isActive = true')
      .andWhere('doctor.acceptsOnlineBooking = true')
      .andWhere('doctor.branchId IS NOT NULL')
      .andWhere('user.isActive = true')
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .getMany();

    const ratingsByDoctor = await this.getRatingSummaries(
      doctors.map((doctor) => doctor.id),
    );

    return Promise.all(
      doctors.map(async (doctor) => {
        const summary = ratingsByDoctor.get(doctor.id);

        return {
          id: doctor.id,
          branchId: doctor.branchId as string,
          firstName: doctor.user.firstName,
          lastName: doctor.user.lastName,
          photoUrl: doctor.photoKey
            ? await this.storageService.getDownloadUrl(doctor.photoKey)
            : null,
          specializations: doctor.specializations,
          experienceYears: doctor.experienceYears,
          description: doctor.description,
          averageRating: summary ? summary.averageRating : null,
          reviewCount: summary ? summary.reviewCount : 0,
        };
      }),
    );
  }

  /** Only reviews explicitly curated for the booking widget (`showInBooking`) count here. */
  private async getRatingSummaries(
    doctorProfileIds: string[],
  ): Promise<Map<string, { averageRating: number; reviewCount: number }>> {
    if (doctorProfileIds.length === 0) {
      return new Map();
    }

    const rows = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.doctorProfileId', 'doctorProfileId')
      .addSelect('AVG(review.rating)', 'averageRating')
      .addSelect('COUNT(review.id)', 'reviewCount')
      .where('review.doctorProfileId IN (:...doctorProfileIds)', {
        doctorProfileIds,
      })
      .andWhere('review.showInBooking = true')
      .andWhere('review.rating > 0')
      .groupBy('review.doctorProfileId')
      .getRawMany<{
        doctorProfileId: string;
        averageRating: string;
        reviewCount: string;
      }>();

    return new Map(
      rows.map((row) => [
        row.doctorProfileId,
        {
          averageRating: Math.round(Number(row.averageRating) * 10) / 10,
          reviewCount: Number(row.reviewCount),
        },
      ]),
    );
  }

  async createBooking(
    clinic: ClinicEntity,
    dto: CreateBookingDto,
  ): Promise<BookingConfirmationDto> {
    const doctor = await this.doctorRepository.findOne({
      where: {
        id: dto.doctorProfileId,
        clinicId: clinic.id,
        isActive: true,
        acceptsOnlineBooking: true,
      },
      relations: { user: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const providesService = await this.doctorRepository
      .createQueryBuilder('doctor')
      .innerJoin('doctor.services', 'service', 'service.id = :serviceId', {
        serviceId: dto.serviceId,
      })
      .where('doctor.id = :doctorProfileId', {
        doctorProfileId: dto.doctorProfileId,
      })
      .getExists();

    if (!providesService) {
      throw new BadRequestException('Doctor does not provide this service');
    }

    const branch = await this.branchRepository.findOne({
      where: { id: dto.branchId, clinicId: clinic.id, isActive: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const params: AvailabilityParams = {
      clinicId: clinic.id,
      doctorProfileId: dto.doctorProfileId,
      serviceId: dto.serviceId,
      branchId: dto.branchId,
    };

    const { appointment, service, patient } = await this.dataSource.transaction(
      async (manager) => {
        const slot = await this.availabilityService.resolveSlot(
          manager,
          params,
          dto.date,
          dto.time,
        );

        if (!slot) {
          throw new ConflictException(
            'The selected time slot is no longer available',
          );
        }

        const patientRepository = manager.getRepository(PatientEntity);
        let bookingPatient = await patientRepository.findOne({
          where: { clinicId: clinic.id, phone: dto.phone },
        });

        if (!bookingPatient) {
          bookingPatient = await patientRepository.save(
            patientRepository.create({
              clinicId: clinic.id,
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone: dto.phone,
              email: dto.email ?? null,
              ...(dto.notificationPreferences
                ? {
                    notificationPreferences: {
                      ...dto.notificationPreferences,
                      push: true,
                    },
                  }
                : {}),
            }),
          );
        } else if (dto.notificationPreferences) {
          // Re-affirmed at booking time — email/whatsapp only; push stays as
          // whatever this patient already has (set via push-subscription, if any).
          bookingPatient = await patientRepository.save({
            ...bookingPatient,
            notificationPreferences: {
              ...bookingPatient.notificationPreferences,
              ...dto.notificationPreferences,
            },
          });
        }

        const appointmentRepository = manager.getRepository(AppointmentEntity);
        const createdAppointment = await appointmentRepository.save(
          appointmentRepository.create({
            clinicId: clinic.id,
            branchId: dto.branchId,
            doctorProfileId: dto.doctorProfileId,
            patientId: bookingPatient.id,
            serviceId: dto.serviceId,
            cabinetId: slot.cabinetId,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            status: AppointmentStatus.PENDING,
            source: AppointmentSource.ONLINE,
            price: slot.service.price,
            comment: dto.comment ?? null,
          }),
        );

        const leadRepository = manager.getRepository(LeadEntity);
        await leadRepository.save(
          leadRepository.create({
            clinicId: clinic.id,
            name: `${dto.firstName} ${dto.lastName}`,
            phone: dto.phone,
            email: dto.email ?? null,
            stage: LeadStage.NEW,
            source: LEAD_SOURCE_ONLINE_BOOKING,
            patientId: bookingPatient.id,
            appointmentId: createdAppointment.id,
          }),
        );

        await this.createReminders(manager, clinic.id, createdAppointment);

        return {
          appointment: createdAppointment,
          service: slot.service,
          patient: bookingPatient,
        };
      },
    );

    const doctorName = `${doctor.user.firstName} ${doctor.user.lastName}`;

    this.dispatchBookingNotifications(
      clinic,
      dto,
      service,
      doctorName,
      branch,
      patient,
      doctor,
    );

    return {
      appointmentId: appointment.id,
      patientId: patient.id,
      status: appointment.status,
      startsAt: appointment.startsAt,
      doctorName,
      serviceName: service.name,
      branchAddress: branch.address,
    };
  }

  // Patient-portal counterpart to createBooking() — the patient is already
  // known (resolved from the JWT, not collected from a contact-info form),
  // so this skips the phone-based patient upsert and the CRM lead row, but
  // otherwise shares the same slot-safety, reminder and notification logic.
  async bookForPatient(
    clinic: ClinicEntity,
    patientId: string,
    dto: BookForPatientDto,
  ): Promise<BookingConfirmationDto> {
    const patient = await this.patientsRepository.findOne({
      where: { id: patientId, clinicId: clinic.id },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const doctor = await this.doctorRepository.findOne({
      where: {
        id: dto.doctorProfileId,
        clinicId: clinic.id,
        isActive: true,
        acceptsOnlineBooking: true,
      },
      relations: { user: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const providesService = await this.doctorRepository
      .createQueryBuilder('doctor')
      .innerJoin('doctor.services', 'service', 'service.id = :serviceId', {
        serviceId: dto.serviceId,
      })
      .where('doctor.id = :doctorProfileId', {
        doctorProfileId: dto.doctorProfileId,
      })
      .getExists();

    if (!providesService) {
      throw new BadRequestException('Doctor does not provide this service');
    }

    const branch = await this.branchRepository.findOne({
      where: { id: dto.branchId, clinicId: clinic.id, isActive: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const params: AvailabilityParams = {
      clinicId: clinic.id,
      doctorProfileId: dto.doctorProfileId,
      serviceId: dto.serviceId,
      branchId: dto.branchId,
    };

    const { appointment, service } = await this.dataSource.transaction(
      async (manager) => {
        const slot = await this.availabilityService.resolveSlot(
          manager,
          params,
          dto.date,
          dto.time,
        );

        if (!slot) {
          throw new ConflictException(
            'The selected time slot is no longer available',
          );
        }

        const appointmentRepository = manager.getRepository(AppointmentEntity);
        const createdAppointment = await appointmentRepository.save(
          appointmentRepository.create({
            clinicId: clinic.id,
            branchId: dto.branchId,
            doctorProfileId: dto.doctorProfileId,
            patientId: patient.id,
            serviceId: dto.serviceId,
            cabinetId: slot.cabinetId,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            status: AppointmentStatus.PENDING,
            source: AppointmentSource.ONLINE,
            price: slot.service.price,
            comment: dto.comment ?? null,
          }),
        );

        await this.createReminders(manager, clinic.id, createdAppointment);

        return { appointment: createdAppointment, service: slot.service };
      },
    );

    const doctorName = `${doctor.user.firstName} ${doctor.user.lastName}`;
    // sendConfirmation/notifyAssignedDoctor/notifyClinicAdmins only read
    // firstName/lastName/date/time/comment off this shape — this satisfies
    // that without a real CreateBookingDto (no phone/email form was involved).
    const bookingLikeDto = {
      date: dto.date,
      time: dto.time,
      firstName: patient.firstName,
      lastName: patient.lastName,
      comment: dto.comment,
    } as CreateBookingDto;

    this.dispatchBookingNotifications(
      clinic,
      bookingLikeDto,
      service,
      doctorName,
      branch,
      patient,
      doctor,
    );

    return {
      appointmentId: appointment.id,
      patientId: patient.id,
      status: appointment.status,
      startsAt: appointment.startsAt,
      doctorName,
      serviceName: service.name,
      branchAddress: branch.address,
    };
  }

  private async createReminders(
    manager: EntityManager,
    clinicId: string,
    appointment: AppointmentEntity,
  ): Promise<void> {
    const settings = await manager.getRepository(ReminderSettingEntity).find({
      where: { clinicId, isEnabled: true },
    });

    const reminderRepository = manager.getRepository(ReminderEntity);
    const now = new Date();
    const reminders = settings
      .map((setting) => ({
        setting,
        scheduledAt: new Date(
          appointment.startsAt.getTime() - setting.offsetMinutes * MINUTE_MS,
        ),
      }))
      .filter(({ scheduledAt }) => scheduledAt > now)
      .map(({ setting, scheduledAt }) =>
        reminderRepository.create({
          appointmentId: appointment.id,
          channel: setting.channel,
          scheduledAt,
          status: ReminderStatus.PENDING,
        }),
      );

    if (reminders.length > 0) {
      await reminderRepository.save(reminders);
    }
  }

  // Fire-and-forget: the patient shouldn't wait on email/whatsapp/push
  // round-trips just to get their booking confirmation response.
  private dispatchBookingNotifications(
    clinic: ClinicEntity,
    dto: CreateBookingDto,
    service: ServiceEntity,
    doctorName: string,
    branch: BranchEntity,
    patient: PatientEntity,
    doctor: DoctorProfileEntity,
  ): void {
    Promise.allSettled([
      this.sendBookingCreatedNotice(
        clinic,
        dto,
        service,
        doctorName,
        branch,
        patient,
      ),
      this.notifyAssignedDoctor(clinic, doctor, dto, service),
      this.notifyClinicAdmins(clinic, doctor, dto, service),
    ])
      .then((results) => {
        results.forEach((result) => {
          if (result.status === 'rejected') {
            this.logger.error(
              'Booking notification dispatch failed',
              result.reason,
            );
          }
        });
      })
      .catch((error) => {
        this.logger.error(
          'Booking notification dispatch failed',
          error instanceof Error ? error.stack : String(error),
        );
      });
  }

  private async sendBookingCreatedNotice(
    clinic: ClinicEntity,
    dto: CreateBookingDto,
    service: ServiceEntity,
    doctorName: string,
    branch: BranchEntity,
    patient: PatientEntity,
  ): Promise<void> {
    const locale = resolveNotificationLocale(clinic.language);
    const { subject, body } = bookingCreatedCopy(locale, {
      clinicName: clinic.name,
      date: dto.date,
      time: dto.time,
      serviceName: service.name,
      doctorName,
      address: branch.address,
      preparation: service.preparation,
    });

    // The confirmation itself is transactional (like a receipt) — always sent
    // regardless of notificationPreferences, same as before. Push is new and
    // opt-in by nature (needs a registered device token), so it's the one
    // channel here that does check consent.
    await this.notificationsService.send(NotificationChannel.SMS, {
      to: dto.phone,
      body,
    });

    if (dto.email) {
      await this.notificationsService.send(NotificationChannel.EMAIL, {
        to: dto.email,
        subject,
        body,
        clinicName: clinic.name,
      });
    }

    if (patient.notificationPreferences.push && patient.fcmTokens.length > 0) {
      await Promise.allSettled(
        patient.fcmTokens.map((token) =>
          this.notificationsService.send(NotificationChannel.PUSH, {
            to: token,
            subject: clinic.name,
            body,
          }),
        ),
      );
    }
  }

  /** Notifies the assigned doctor of a new online booking, per their own channel preferences. */
  private async notifyAssignedDoctor(
    clinic: ClinicEntity,
    doctor: DoctorProfileEntity,
    dto: CreateBookingDto,
    service: ServiceEntity,
  ): Promise<void> {
    const { user } = doctor;
    const prefs = user.notificationPreferences;
    const patientName = `${dto.firstName} ${dto.lastName}`;
    const locale = resolveNotificationLocale(clinic.language);
    const { subject, body } = newBookingDoctorCopy(locale, {
      patientName,
      serviceName: service.name,
      date: dto.date,
      time: dto.time,
    });

    const sends: Promise<void>[] = [];

    if ((prefs?.email ?? true) && user.email) {
      sends.push(
        this.notificationsService.send(NotificationChannel.EMAIL, {
          to: user.email,
          subject,
          body,
          clinicName: clinic.name,
        }),
      );
    }

    if ((prefs?.whatsapp ?? true) && user.phone) {
      sends.push(
        this.notificationsService.send(NotificationChannel.WHATSAPP, {
          to: user.phone,
          body,
        }),
      );
    }

    if (prefs?.push ?? true) {
      sends.push(
        ...user.fcmTokens.map((token) =>
          this.notificationsService.send(NotificationChannel.PUSH, {
            to: token,
            subject,
            body,
          }),
        ),
      );
    }

    if (prefs?.inApp ?? true) {
      sends.push(
        this.notificationsService.send(NotificationChannel.IN_APP, {
          to: user.id,
          subject,
          body,
          clinicId: clinic.id,
        }),
      );
    }

    await Promise.allSettled(sends);
  }

  private async notifyClinicAdmins(
    clinic: ClinicEntity,
    doctor: DoctorProfileEntity,
    dto: CreateBookingDto,
    service: ServiceEntity,
  ): Promise<void> {
    const admins = await findClinicAdmins(this.usersRepository, clinic.id);
    const patientName = `${dto.firstName} ${dto.lastName}`;
    const doctorName = `${doctor.user.firstName} ${doctor.user.lastName}`;
    const locale = resolveNotificationLocale(clinic.language);
    const copy = newBookingAdminCopy(locale, {
      patientName,
      doctorName,
      serviceName: service.name,
      date: dto.date,
      time: dto.time,
    });

    await this.notificationsService.notifyStaffMembers(admins, {
      ...copy,
      clinicName: clinic.name,
    });
  }

  /** Registers a push-notification device token from the booking widget for an existing patient. */
  async registerPushToken(
    clinicId: string,
    patientId: string,
    token: string,
  ): Promise<void> {
    const patient = await this.patientsRepository.findOne({
      where: { id: patientId, clinicId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    if (patient.fcmTokens.includes(token)) {
      return;
    }

    await this.patientsRepository.update(patient.id, {
      fcmTokens: [...patient.fcmTokens, token],
      notificationPreferences: {
        ...patient.notificationPreferences,
        push: true,
      },
    });
  }

  private toServiceDto(service: ServiceEntity): BookingServiceDto {
    return {
      id: service.id,
      name: service.name,
      price: service.price,
      durationMinutes: service.durationMinutes,
      description: service.description,
      preparation: service.preparation,
    };
  }
}
