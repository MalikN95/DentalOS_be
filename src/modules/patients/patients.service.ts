import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PaginatedResult } from './patients.types';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentsRepository: Repository<AppointmentEntity>,
  ) {}

  async findAll(
    clinicId: string,
    query: ListPatientsQueryDto,
  ): Promise<PaginatedResult<PatientEntity>> {
    const { page, limit, search, isActive, createdFrom, createdTo } = query;

    const qb = this.patientsRepository
      .createQueryBuilder('patient')
      .where('patient.clinicId = :clinicId', { clinicId });

    if (isActive !== undefined) {
      qb.andWhere('patient.isActive = :isActive', { isActive });
    }

    if (createdFrom) {
      qb.andWhere('patient.createdAt >= :createdFrom', { createdFrom });
    }

    if (createdTo) {
      qb.andWhere('patient.createdAt <= :createdTo', { createdTo });
    }

    if (search) {
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('patient.firstName ILIKE :search')
            .orWhere('patient.lastName ILIKE :search')
            .orWhere('patient.phone ILIKE :search')
            .orWhere('patient.email ILIKE :search');
        }),
      ).setParameter('search', `%${search}%`);
    }

    const [items, total] = await qb
      .orderBy('patient.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async findOne(clinicId: string, id: string): Promise<PatientEntity> {
    const patient = await this.patientsRepository.findOne({
      where: { id, clinicId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  create(clinicId: string, dto: CreatePatientDto): Promise<PatientEntity> {
    const patient = this.patientsRepository.create({ ...dto, clinicId });
    return this.patientsRepository.save(patient);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdatePatientDto,
  ): Promise<PatientEntity> {
    const patient = await this.findOne(clinicId, id);
    this.patientsRepository.merge(patient, dto);
    return this.patientsRepository.save(patient);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const patient = await this.findOne(clinicId, id);
    await this.patientsRepository.softRemove(patient);
  }

  async getHistory(
    clinicId: string,
    patientId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<AppointmentEntity>> {
    await this.findOne(clinicId, patientId);

    const { page, limit } = query;
    const [items, total] = await this.appointmentsRepository.findAndCount({
      where: { patientId, clinicId },
      relations: {
        doctorProfile: { user: true },
        service: true,
        branch: true,
        cabinet: true,
      },
      order: { startsAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }
}
