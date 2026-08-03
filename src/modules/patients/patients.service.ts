import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { resolveOwnDoctorProfileIdIfDoctor } from '../../common/helpers/resolve-own-doctor-profile-id.helper';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { OtpCodeEntity, OtpPurpose } from '../../entities/otp-code.entity';
import { PatientTagEntity } from '../../entities/patient-tag.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PaginatedResult } from './patients.types';

const OWN_PATIENTS_EXISTS = `EXISTS (
  SELECT 1 FROM appointments a
  WHERE a."patientId" = patient.id
    AND a."doctorProfileId" = :ownDoctorProfileId
    AND a."deletedAt" IS NULL
)`;

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentsRepository: Repository<AppointmentEntity>,
    @InjectRepository(PatientTagEntity)
    private readonly tagsRepository: Repository<PatientTagEntity>,
    @InjectRepository(DoctorProfileEntity)
    private readonly doctorProfilesRepository: Repository<DoctorProfileEntity>,
    @InjectRepository(OtpCodeEntity)
    private readonly otpCodesRepository: Repository<OtpCodeEntity>,
  ) {}

  // Dev/QA convenience only — see OtpCodeEntity#devPlainCode. Returns null in
  // any real deployment (the column is only ever populated there), and null
  // once the patient's current code has been used or has expired.
  async getDevLoginCode(
    clinicId: string,
    patientId: string,
  ): Promise<{ code: string | null }> {
    const patient = await this.findOne(clinicId, patientId);

    const otp = await this.otpCodesRepository.findOne({
      where: {
        clinicId,
        destination: patient.phone,
        purpose: OtpPurpose.SMS_LOGIN,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.expiresAt.getTime() <= Date.now()) {
      return { code: null };
    }

    return { code: otp.devPlainCode };
  }

  async findAll(
    clinicId: string,
    query: ListPatientsQueryDto,
    user: JwtPayload,
  ): Promise<PaginatedResult<PatientEntity>> {
    const { page, limit, search, isActive, createdFrom, createdTo, tagIds } =
      query;

    const ownDoctorProfileId = await resolveOwnDoctorProfileIdIfDoctor(
      this.doctorProfilesRepository,
      clinicId,
      user,
    );

    const qb = this.patientsRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.tags', 'tags')
      .where('patient.clinicId = :clinicId', { clinicId });

    if (ownDoctorProfileId) {
      // A doctor only ever sees patients they've had an appointment with.
      qb.andWhere(OWN_PATIENTS_EXISTS, { ownDoctorProfileId });
    }

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

  // `user` is only passed from the controller's own GET :id route — internal
  // callers (update/remove/addTag/etc. acting on a patient already reached
  // through a write-gated route) omit it and stay unscoped.
  async findOne(
    clinicId: string,
    id: string,
    user?: JwtPayload,
  ): Promise<PatientEntity> {
    const ownDoctorProfileId = user
      ? await resolveOwnDoctorProfileIdIfDoctor(
          this.doctorProfilesRepository,
          clinicId,
          user,
        )
      : null;

    const qb = this.patientsRepository
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.tags', 'tags')
      .where('patient.id = :id', { id })
      .andWhere('patient.clinicId = :clinicId', { clinicId });

    if (ownDoctorProfileId) {
      qb.andWhere(OWN_PATIENTS_EXISTS, { ownDoctorProfileId });
    }

    const patient = await qb.getOne();

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  create(clinicId: string, dto: CreatePatientDto): Promise<PatientEntity> {
    const patient = this.patientsRepository.create({
      ...dto,
      clinicId,
      // `push` can only ever be granted from the patient's own browser — never
      // set from this staff-facing form, so it always defaults true here.
      ...(dto.notificationPreferences
        ? {
            notificationPreferences: {
              push: true,
              ...dto.notificationPreferences,
            },
          }
        : {}),
    });
    return this.patientsRepository.save(patient);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdatePatientDto,
  ): Promise<PatientEntity> {
    const patient = await this.findOne(clinicId, id);
    const { notificationPreferences, ...rest } = dto;
    this.patientsRepository.merge(patient, rest);

    // Deep-merge so this staff-facing form (email/whatsapp only) can never
    // wipe out a `push` consent the patient granted from the booking widget.
    if (notificationPreferences) {
      patient.notificationPreferences = {
        ...patient.notificationPreferences,
        ...notificationPreferences,
      };
    }

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
    user?: JwtPayload,
  ): Promise<PaginatedResult<AppointmentEntity>> {
    await this.findOne(clinicId, patientId, user);

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
