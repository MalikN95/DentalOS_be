import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  EntityManager,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { BranchEntity } from '../../entities/branch.entity';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { DoctorScheduleEntity } from '../../entities/doctor-schedule.entity';
import {
  EquipmentEntity,
  EquipmentStatus,
} from '../../entities/equipment.entity';
import { ScheduleExceptionEntity } from '../../entities/schedule-exception.entity';
import { ServiceEntity } from '../../entities/service.entity';

const SLOT_STEP_MINUTES = 15;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const OCCUPYING_STATUSES_EXCLUDED: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];

export interface AvailabilityParams {
  clinicId: string;
  doctorProfileId: string;
  serviceId: string;
  branchId: string;
}

export interface ResolvedSlot {
  cabinetId: string;
  startsAt: Date;
  endsAt: Date;
  service: ServiceEntity;
}

interface DaySlot {
  time: string;
  startsAt: Date;
  endsAt: Date;
  cabinetId: string;
}

interface AvailabilityRepositories {
  branch: Repository<BranchEntity>;
  doctor: Repository<DoctorProfileEntity>;
  service: Repository<ServiceEntity>;
  schedule: Repository<DoctorScheduleEntity>;
  exception: Repository<ScheduleExceptionEntity>;
  appointment: Repository<AppointmentEntity>;
  cabinet: Repository<CabinetEntity>;
  equipment: Repository<EquipmentEntity>;
}

interface AvailabilityContext {
  params: AvailabilityParams;
  doctor: DoctorProfileEntity;
  service: ServiceEntity;
  schedulesByWeekday: Map<number, DoctorScheduleEntity>;
  exceptions: ScheduleExceptionEntity[];
  appointments: AppointmentEntity[];
  cabinets: CabinetEntity[];
}

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const toTimeString = (totalMinutes: number): string => {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// TODO: timezone-aware conversion using clinic.timezone; for now the server
// and the clinic are assumed to share the same timezone.
const toLocalDateTime = (date: string, time: string): Date =>
  new Date(`${date}T${time}:00`);

const formatLocalDate = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 0 = Monday ... 6 = Sunday (JS getDay: 0 = Sunday)
const weekdayOf = (date: string): number =>
  (toLocalDateTime(date, '00:00').getDay() + 6) % 7;

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(DoctorProfileEntity)
    private readonly doctorRepository: Repository<DoctorProfileEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(DoctorScheduleEntity)
    private readonly scheduleRepository: Repository<DoctorScheduleEntity>,
    @InjectRepository(ScheduleExceptionEntity)
    private readonly exceptionRepository: Repository<ScheduleExceptionEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepository: Repository<AppointmentEntity>,
    @InjectRepository(CabinetEntity)
    private readonly cabinetRepository: Repository<CabinetEntity>,
    @InjectRepository(EquipmentEntity)
    private readonly equipmentRepository: Repository<EquipmentEntity>,
  ) {}

  async getAvailableDays(
    params: AvailabilityParams,
    month: string,
  ): Promise<string[]> {
    const [yearPart, monthPart] = month.split('-').map(Number);
    const daysInMonth = new Date(yearPart, monthPart, 0).getDate();
    const firstDate = `${month}-01`;
    const lastDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;

    const context = await this.loadContext(
      this.repositories(),
      params,
      firstDate,
      lastDate,
    );

    const now = new Date();
    const today = formatLocalDate(now);
    const days: string[] = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${month}-${String(day).padStart(2, '0')}`;

      if (
        date >= today &&
        this.collectDaySlots(context, date, now).length > 0
      ) {
        days.push(date);
      }
    }

    return days;
  }

  async getAvailableSlots(
    params: AvailabilityParams,
    date: string,
  ): Promise<string[]> {
    const context = await this.loadContext(
      this.repositories(),
      params,
      date,
      date,
    );

    return this.collectDaySlots(context, date, new Date()).map(
      (slot) => slot.time,
    );
  }

  // Re-checks the slot inside the booking transaction and picks a free cabinet.
  async resolveSlot(
    manager: EntityManager,
    params: AvailabilityParams,
    date: string,
    time: string,
  ): Promise<ResolvedSlot | null> {
    const context = await this.loadContext(
      this.repositories(manager),
      params,
      date,
      date,
    );

    const slot = this.collectDaySlots(context, date, new Date()).find(
      (candidate) => candidate.time === time,
    );

    if (!slot) {
      return null;
    }

    return {
      cabinetId: slot.cabinetId,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      service: context.service,
    };
  }

  private repositories(manager?: EntityManager): AvailabilityRepositories {
    if (!manager) {
      return {
        branch: this.branchRepository,
        doctor: this.doctorRepository,
        service: this.serviceRepository,
        schedule: this.scheduleRepository,
        exception: this.exceptionRepository,
        appointment: this.appointmentRepository,
        cabinet: this.cabinetRepository,
        equipment: this.equipmentRepository,
      };
    }

    return {
      branch: manager.getRepository(BranchEntity),
      doctor: manager.getRepository(DoctorProfileEntity),
      service: manager.getRepository(ServiceEntity),
      schedule: manager.getRepository(DoctorScheduleEntity),
      exception: manager.getRepository(ScheduleExceptionEntity),
      appointment: manager.getRepository(AppointmentEntity),
      cabinet: manager.getRepository(CabinetEntity),
      equipment: manager.getRepository(EquipmentEntity),
    };
  }

  // Single batch of queries covering [firstDate, lastDate] (inclusive).
  private async loadContext(
    repos: AvailabilityRepositories,
    params: AvailabilityParams,
    firstDate: string,
    lastDate: string,
  ): Promise<AvailabilityContext> {
    const { clinicId, doctorProfileId, serviceId, branchId } = params;

    const branch = await repos.branch.findOne({
      where: { id: branchId, clinicId, isActive: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const doctor = await repos.doctor.findOne({
      where: {
        id: doctorProfileId,
        clinicId,
        isActive: true,
        acceptsOnlineBooking: true,
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const service = await repos.service.findOne({
      where: {
        id: serviceId,
        clinicId,
        isActive: true,
        acceptsOnlineBooking: true,
      },
      relations: { allowedCabinets: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const rangeStart = toLocalDateTime(firstDate, '00:00');
    const rangeEnd = new Date(
      toLocalDateTime(lastDate, '00:00').getTime() + DAY_MS,
    );

    const [schedules, exceptions, appointments, cabinets] = await Promise.all([
      repos.schedule.find({ where: { doctorProfileId, branchId } }),
      repos.exception.find({
        where: {
          doctorProfileId,
          dateFrom: LessThanOrEqual(lastDate),
          dateTo: MoreThanOrEqual(firstDate),
        },
      }),
      repos.appointment
        .createQueryBuilder('appointment')
        .where('appointment.clinicId = :clinicId', { clinicId })
        .andWhere('appointment.status NOT IN (:...excludedStatuses)', {
          excludedStatuses: OCCUPYING_STATUSES_EXCLUDED,
        })
        .andWhere('appointment.startsAt < :rangeEnd', { rangeEnd })
        .andWhere('appointment.endsAt > :rangeStart', { rangeStart })
        .andWhere(
          new Brackets((qb) => {
            qb.where('appointment.doctorProfileId = :doctorProfileId', {
              doctorProfileId,
            }).orWhere(
              'appointment.branchId = :branchId AND appointment.cabinetId IS NOT NULL',
              { branchId },
            );
          }),
        )
        .getMany(),
      this.loadCandidateCabinets(repos, service, branchId),
    ]);

    return {
      params,
      doctor,
      service,
      schedulesByWeekday: new Map(
        schedules.map((schedule) => [schedule.weekday, schedule]),
      ),
      exceptions,
      appointments,
      cabinets,
    };
  }

  private async loadCandidateCabinets(
    repos: AvailabilityRepositories,
    service: ServiceEntity,
    branchId: string,
  ): Promise<CabinetEntity[]> {
    const cabinets =
      service.allowedCabinets.length > 0
        ? service.allowedCabinets.filter(
            (cabinet) => cabinet.branchId === branchId && cabinet.isActive,
          )
        : await repos.cabinet.find({ where: { branchId, isActive: true } });

    if (service.requiredEquipmentTypes.length === 0 || cabinets.length === 0) {
      return cabinets;
    }

    const equipment = await repos.equipment.find({
      where: {
        branchId,
        status: EquipmentStatus.ACTIVE,
        type: In(service.requiredEquipmentTypes),
      },
    });

    // Branch-level equipment (cabinetId = null) satisfies any cabinet.
    return cabinets.filter((cabinet) =>
      service.requiredEquipmentTypes.every((requiredType) =>
        equipment.some(
          (item) =>
            item.type === requiredType &&
            (item.cabinetId === cabinet.id || item.cabinetId === null),
        ),
      ),
    );
  }

  private collectDaySlots(
    context: AvailabilityContext,
    date: string,
    now: Date,
  ): DaySlot[] {
    const { maxAdvanceBookingDays } = context.doctor;

    if (maxAdvanceBookingDays !== null) {
      const maxDate = new Date(now);
      maxDate.setDate(maxDate.getDate() + maxAdvanceBookingDays);

      if (date > formatLocalDate(maxDate)) {
        return [];
      }
    }

    const schedule = context.schedulesByWeekday.get(weekdayOf(date));

    if (!schedule) {
      return [];
    }

    const isBlocked = context.exceptions.some(
      (exception) => exception.dateFrom <= date && exception.dateTo >= date,
    );

    if (isBlocked || context.cabinets.length === 0) {
      return [];
    }

    const duration = context.service.durationMinutes;
    const startMinutes = toMinutes(schedule.startTime);
    const endMinutes = toMinutes(schedule.endTime);
    const slots: DaySlot[] = [];

    for (
      let minutes = startMinutes;
      minutes + duration <= endMinutes;
      minutes += SLOT_STEP_MINUTES
    ) {
      const time = toTimeString(minutes);
      const startsAt = toLocalDateTime(date, time);

      if (startsAt > now) {
        const endsAt = new Date(startsAt.getTime() + duration * MINUTE_MS);
        const overlapping = context.appointments.filter(
          (appointment) =>
            appointment.startsAt < endsAt && appointment.endsAt > startsAt,
        );

        const doctorBusy = overlapping.some(
          (appointment) =>
            appointment.doctorProfileId === context.params.doctorProfileId,
        );

        if (!doctorBusy) {
          const freeCabinet = context.cabinets.find(
            (cabinet) =>
              !overlapping.some(
                (appointment) => appointment.cabinetId === cabinet.id,
              ),
          );

          if (freeCabinet) {
            slots.push({ time, startsAt, endsAt, cabinetId: freeCabinet.id });
          }
        }
      }
    }

    return slots;
  }
}
