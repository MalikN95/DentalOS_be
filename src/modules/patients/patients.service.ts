import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { PatientTagEntity } from '../../entities/patient-tag.entity';
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
    @InjectRepository(PatientTagEntity)
    private readonly tagsRepository: Repository<PatientTagEntity>,
  ) {}

  async findAll(
    clinicId: string,
    query: ListPatientsQueryDto,
  ): Promise<PaginatedResult<PatientEntity>> {
    const { page, limit, search, isActive, createdFrom, createdTo, tagIds } =
      query;

    const qb = this.patientsRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.tags', 'tags')
      .where('patient.clinicId = :clinicId', { clinicId });

    if (isActive !== undefined) {
      qb.andWhere('patient.isActive = :isActive', { isActive });
    }

    if (tagIds && tagIds.length > 0) {
      // A separate EXISTS check, not a filter on the `tags` join above — that
      // join is only there to eager-load each matching patient's FULL tag
      // list for display, not to narrow it down to the matched tags.
      qb.andWhere(
        `EXISTS (SELECT 1 FROM "patient_tag_assignments" pta WHERE pta."patientId" = patient.id AND pta."tagId" IN (:...tagIds))`,
        { tagIds },
      );
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

  async listAllergiesCatalog(clinicId: string): Promise<string[]> {
    const rows: { value: string }[] = await this.patientsRepository.query(
      `SELECT DISTINCT value FROM patients, jsonb_array_elements_text(allergies) AS value WHERE "clinicId" = $1 AND "deletedAt" IS NULL ORDER BY value ASC`,
      [clinicId],
    );
    return rows.map((row) => row.value);
  }

  async listChronicDiseasesCatalog(clinicId: string): Promise<string[]> {
    const rows: { value: string }[] = await this.patientsRepository.query(
      `SELECT DISTINCT value FROM patients, jsonb_array_elements_text("chronicDiseases") AS value WHERE "clinicId" = $1 AND "deletedAt" IS NULL ORDER BY value ASC`,
      [clinicId],
    );
    return rows.map((row) => row.value);
  }

  async findOne(clinicId: string, id: string): Promise<PatientEntity> {
    const patient = await this.patientsRepository.findOne({
      where: { id, clinicId },
      relations: { tags: true },
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

  async addTag(
    clinicId: string,
    patientId: string,
    tagId: string,
  ): Promise<PatientEntity> {
    const patient = await this.findOne(clinicId, patientId);

    const tag = await this.tagsRepository.findOne({
      where: { id: tagId, clinicId },
    });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    if (!patient.tags.some((existing) => existing.id === tagId)) {
      await this.patientsRepository
        .createQueryBuilder()
        .relation(PatientEntity, 'tags')
        .of(patient)
        .add(tag);
      patient.tags = [...patient.tags, tag];
    }

    return patient;
  }

  async removeTag(
    clinicId: string,
    patientId: string,
    tagId: string,
  ): Promise<PatientEntity> {
    const patient = await this.findOne(clinicId, patientId);

    await this.patientsRepository
      .createQueryBuilder()
      .relation(PatientEntity, 'tags')
      .of(patient)
      .remove(tagId);

    patient.tags = patient.tags.filter((existing) => existing.id !== tagId);
    return patient;
  }
}
