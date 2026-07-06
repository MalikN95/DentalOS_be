import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { MedicalRecordEntity } from '../../entities/medical-record.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { ListMedicalRecordsQueryDto } from './dto/list-medical-records-query.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { assertPatientInClinic } from './helpers/assert-patient-in-clinic.helper';
import { resolveDoctorProfileId } from './helpers/resolve-doctor-profile-id.helper';
import { PaginatedResult } from './types/paginated-result.type';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectRepository(MedicalRecordEntity)
    private readonly recordRepository: Repository<MedicalRecordEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientRepository: Repository<PatientEntity>,
    @InjectRepository(DoctorProfileEntity)
    private readonly doctorProfileRepository: Repository<DoctorProfileEntity>,
  ) {}

  async list(
    clinicId: string,
    query: ListMedicalRecordsQueryDto,
  ): Promise<PaginatedResult<MedicalRecordEntity>> {
    await assertPatientInClinic(
      this.patientRepository,
      query.patientId,
      clinicId,
    );

    const [items, total] = await this.recordRepository.findAndCount({
      where: { patientId: query.patientId },
      relations: { doctorProfile: { user: true }, appointment: true },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { items, total, page: query.page, limit: query.limit };
  }

  async findOne(clinicId: string, id: string): Promise<MedicalRecordEntity> {
    const record = await this.recordRepository.findOne({
      where: { id, patient: { clinicId } },
      relations: { doctorProfile: { user: true }, appointment: true },
    });

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    return record;
  }

  async create(
    clinicId: string,
    user: JwtPayload,
    dto: CreateMedicalRecordDto,
  ): Promise<MedicalRecordEntity> {
    await assertPatientInClinic(
      this.patientRepository,
      dto.patientId,
      clinicId,
    );

    const doctorProfileId = await resolveDoctorProfileId(
      this.doctorProfileRepository,
      clinicId,
      user,
      dto.doctorProfileId,
    );

    const record = this.recordRepository.create({
      patientId: dto.patientId,
      doctorProfileId,
      appointmentId: dto.appointmentId ?? null,
      diagnosis: dto.diagnosis,
      treatment: dto.treatment ?? null,
      notes: dto.notes ?? null,
    });

    const saved = await this.recordRepository.save(record);

    return this.findOne(clinicId, saved.id);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateMedicalRecordDto,
  ): Promise<MedicalRecordEntity> {
    const record = await this.findOne(clinicId, id);

    if (dto.diagnosis !== undefined) {
      record.diagnosis = dto.diagnosis;
    }
    if (dto.treatment !== undefined) {
      record.treatment = dto.treatment;
    }
    if (dto.notes !== undefined) {
      record.notes = dto.notes;
    }
    if (dto.appointmentId !== undefined) {
      record.appointmentId = dto.appointmentId;
    }

    await this.recordRepository.save(record);

    return this.findOne(clinicId, id);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const record = await this.findOne(clinicId, id);

    await this.recordRepository.softRemove(record);
  }
}
