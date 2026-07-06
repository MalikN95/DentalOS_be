import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { LeadEntity, LeadStage } from '../../entities/lead.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { FunnelResult, PaginatedResult } from './types/crm.types';

const FUNNEL_GROUP_LIMIT = 100;

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leadsRepository: Repository<LeadEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentsRepository: Repository<AppointmentEntity>,
  ) {}

  async findAll(
    clinicId: string,
    query: ListLeadsQueryDto,
  ): Promise<PaginatedResult<LeadEntity>> {
    const { page, limit, stage, search } = query;

    const base: FindOptionsWhere<LeadEntity> = { clinicId };

    if (stage !== undefined) {
      base.stage = stage;
    }

    const where: FindOptionsWhere<LeadEntity>[] = search
      ? [
          { ...base, name: ILike(`%${search}%`) },
          { ...base, phone: ILike(`%${search}%`) },
          { ...base, email: ILike(`%${search}%`) },
        ]
      : [base];

    const [items, total] = await this.leadsRepository.findAndCount({
      where,
      relations: { patient: true, appointment: true },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getFunnel(clinicId: string): Promise<FunnelResult> {
    const allStages = Object.values(LeadStage);

    const results = await Promise.all(
      allStages.map((stage) =>
        this.leadsRepository.findAndCount({
          where: { clinicId, stage },
          relations: { patient: true, appointment: true },
          order: { updatedAt: 'DESC' },
          take: FUNNEL_GROUP_LIMIT,
        }),
      ),
    );

    const stages = {} as Record<LeadStage, LeadEntity[]>;
    const counts = {} as Record<LeadStage, number>;

    allStages.forEach((stage, index) => {
      const [items, total] = results[index];
      stages[stage] = items;
      counts[stage] = total;
    });

    return { stages, counts };
  }

  async create(clinicId: string, dto: CreateLeadDto): Promise<LeadEntity> {
    if (dto.patientId) {
      await this.assertPatientBelongsToClinic(clinicId, dto.patientId);
    }

    const lead = this.leadsRepository.create({
      clinicId,
      name: dto.name,
      phone: dto.phone,
      email: dto.email ?? null,
      source: dto.source ?? null,
      comment: dto.comment ?? null,
      patientId: dto.patientId ?? null,
    });

    return this.leadsRepository.save(lead);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateLeadDto,
  ): Promise<LeadEntity> {
    const lead = await this.findOne(clinicId, id);

    if (dto.patientId) {
      await this.assertPatientBelongsToClinic(clinicId, dto.patientId);
    }

    if (dto.appointmentId) {
      await this.assertAppointmentBelongsToClinic(clinicId, dto.appointmentId);
    }

    this.leadsRepository.merge(lead, dto);
    await this.leadsRepository.save(lead);

    return this.findOne(clinicId, id);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const lead = await this.findOne(clinicId, id);
    await this.leadsRepository.softRemove(lead);
  }

  private async findOne(clinicId: string, id: string): Promise<LeadEntity> {
    const lead = await this.leadsRepository.findOne({
      where: { id, clinicId },
      relations: { patient: true, appointment: true },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  private async assertPatientBelongsToClinic(
    clinicId: string,
    patientId: string,
  ): Promise<void> {
    const patient = await this.patientsRepository.findOne({
      where: { id: patientId, clinicId },
    });

    if (!patient) {
      throw new BadRequestException('Patient does not belong to this clinic');
    }
  }

  private async assertAppointmentBelongsToClinic(
    clinicId: string,
    appointmentId: string,
  ): Promise<void> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id: appointmentId, clinicId },
    });

    if (!appointment) {
      throw new BadRequestException(
        'Appointment does not belong to this clinic',
      );
    }
  }
}
