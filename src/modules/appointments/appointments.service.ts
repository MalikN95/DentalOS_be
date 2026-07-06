import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import {
  AppointmentEntity,
  AppointmentSource,
} from '../../entities/appointment.entity';
import { BranchEntity } from '../../entities/branch.entity';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ReminderEntity, ReminderStatus } from '../../entities/reminder.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

const MAX_RANGE_DAYS = 62;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

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
  ) {}

  async findMany(
    clinicId: string,
    query: QueryAppointmentsDto,
  ): Promise<AppointmentEntity[]> {
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

    if (query.doctorProfileId) {
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

  async findOne(clinicId: string, id: string): Promise<AppointmentEntity> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id, clinicId },
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

    const startsAt = new Date(dto.startsAt);
    const endsAt = this.computeEndsAt(startsAt, service.durationMinutes);

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

    const saved = await this.appointmentsRepository.save(appointment);

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
    const startsAt = new Date(dto.startsAt);
    const endsAt = this.computeEndsAt(startsAt, service.durationMinutes);

    await this.assertNoConflict(
      clinicId,
      doctorProfileId,
      cabinetId,
      startsAt,
      endsAt,
      appointment.id,
    );

    appointment.doctorProfileId = doctorProfileId;
    appointment.cabinetId = cabinetId;
    appointment.branchId = dto.branchId ?? appointment.branchId;
    appointment.startsAt = startsAt;
    appointment.endsAt = endsAt;

    await this.appointmentsRepository.save(appointment);

    return this.findOne(clinicId, id);
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

    appointment.status = dto.status;

    if (dto.status === AppointmentStatus.CANCELLED) {
      appointment.cancellationReason = dto.cancellationReason ?? null;
      await this.remindersRepository.update(
        { appointmentId: appointment.id, status: ReminderStatus.PENDING },
        { status: ReminderStatus.CANCELLED },
      );
    }

    await this.appointmentsRepository.save(appointment);

    return this.findOne(clinicId, id);
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

    await this.appointmentsRepository.save(appointment);

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
