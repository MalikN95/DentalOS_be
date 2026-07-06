import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import {
  AppointmentEntity,
  AppointmentSource,
} from '../../entities/appointment.entity';
import { BranchEntity } from '../../entities/branch.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { DoctorScheduleEntity } from '../../entities/doctor-schedule.entity';
import { LeadEntity, LeadStage } from '../../entities/lead.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ReminderSettingEntity } from '../../entities/reminder-setting.entity';
import { ReminderEntity, ReminderStatus } from '../../entities/reminder.entity';
import { ServiceCategoryEntity } from '../../entities/service-category.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import {
  AvailabilityParams,
  AvailabilityService,
} from './availability.service';
import { BookingBranchDto } from './dto/booking-branch.dto';
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
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(ServiceCategoryEntity)
    private readonly categoryRepository: Repository<ServiceCategoryEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(DoctorProfileEntity)
    private readonly doctorRepository: Repository<DoctorProfileEntity>,
    private readonly dataSource: DataSource,
    private readonly availabilityService: AvailabilityService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

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
        where: { clinicId, isActive: true },
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
    const { serviceId, branchId } = query;

    const doctors = await this.doctorRepository
      .createQueryBuilder('doctor')
      .innerJoin('doctor.services', 'service', 'service.id = :serviceId', {
        serviceId,
      })
      .innerJoinAndSelect('doctor.user', 'user')
      .where('doctor.clinicId = :clinicId', { clinicId })
      .andWhere('doctor.isActive = true')
      .andWhere('user.isActive = true')
      .andWhere(
        new Brackets((qb) => {
          qb.where('doctor.branchId = :branchId', { branchId }).orWhere(
            (subQb: SelectQueryBuilder<DoctorProfileEntity>) => {
              const subQuery = subQb
                .subQuery()
                .select('1')
                .from(DoctorScheduleEntity, 'schedule')
                .where('schedule.doctorProfileId = doctor.id')
                .andWhere('schedule.branchId = :branchId')
                .getQuery();

              return `EXISTS ${subQuery}`;
            },
          );
        }),
      )
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .getMany();

    return Promise.all(
      doctors.map(async (doctor) => ({
        id: doctor.id,
        firstName: doctor.user.firstName,
        lastName: doctor.user.lastName,
        photoUrl: doctor.photoKey
          ? await this.storageService.getDownloadUrl(doctor.photoKey)
          : null,
        specializations: doctor.specializations,
        experienceYears: doctor.experienceYears,
        description: doctor.description,
      })),
    );
  }

  async createBooking(
    clinic: ClinicEntity,
    dto: CreateBookingDto,
  ): Promise<BookingConfirmationDto> {
    const doctor = await this.doctorRepository.findOne({
      where: { id: dto.doctorProfileId, clinicId: clinic.id, isActive: true },
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

        const patientRepository = manager.getRepository(PatientEntity);
        let patient = await patientRepository.findOne({
          where: { clinicId: clinic.id, phone: dto.phone },
        });

        if (!patient) {
          patient = await patientRepository.save(
            patientRepository.create({
              clinicId: clinic.id,
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone: dto.phone,
              email: dto.email ?? null,
            }),
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

        const leadRepository = manager.getRepository(LeadEntity);
        await leadRepository.save(
          leadRepository.create({
            clinicId: clinic.id,
            name: `${dto.firstName} ${dto.lastName}`,
            phone: dto.phone,
            email: dto.email ?? null,
            stage: LeadStage.NEW,
            source: LEAD_SOURCE_ONLINE_BOOKING,
            patientId: patient.id,
            appointmentId: createdAppointment.id,
          }),
        );

        await this.createReminders(manager, clinic.id, createdAppointment);

        return { appointment: createdAppointment, service: slot.service };
      },
    );

    const doctorName = `${doctor.user.firstName} ${doctor.user.lastName}`;

    await this.sendConfirmation(clinic, dto, service, doctorName, branch);

    return {
      appointmentId: appointment.id,
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

  private async sendConfirmation(
    clinic: ClinicEntity,
    dto: CreateBookingDto,
    service: ServiceEntity,
    doctorName: string,
    branch: BranchEntity,
  ): Promise<void> {
    const lines = [
      `${clinic.name}: your appointment is booked.`,
      `Date: ${dto.date} ${dto.time}`,
      `Service: ${service.name}`,
      `Doctor: ${doctorName}`,
      `Address: ${branch.address}`,
    ];

    if (service.preparation) {
      lines.push(`Preparation: ${service.preparation}`);
    }

    const body = lines.join('\n');

    await this.notificationsService.send(NotificationChannel.SMS, {
      to: dto.phone,
      body,
    });

    if (dto.email) {
      await this.notificationsService.send(NotificationChannel.EMAIL, {
        to: dto.email,
        subject: `Appointment confirmation — ${clinic.name}`,
        body,
      });
    }
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
