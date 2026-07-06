import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ToothMarkEntity } from '../../entities/tooth-mark.entity';
import { CreateToothMarkDto } from './dto/create-tooth-mark.dto';
import { ToothHistoryQueryDto } from './dto/tooth-history-query.dto';
import { ToothStateDto } from './dto/tooth-state.dto';
import { assertPatientInClinic } from './helpers/assert-patient-in-clinic.helper';
import { PaginatedResult } from './types/paginated-result.type';

@Injectable()
export class DentalChartService {
  constructor(
    @InjectRepository(ToothMarkEntity)
    private readonly toothMarkRepository: Repository<ToothMarkEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientRepository: Repository<PatientEntity>,
    @InjectRepository(DoctorProfileEntity)
    private readonly doctorProfileRepository: Repository<DoctorProfileEntity>,
  ) {}

  // Current chart = latest mark per tooth (Postgres DISTINCT ON)
  async getChart(
    clinicId: string,
    patientId: string,
  ): Promise<ToothStateDto[]> {
    await assertPatientInClinic(this.patientRepository, patientId, clinicId);

    const marks = await this.toothMarkRepository
      .createQueryBuilder('mark')
      .distinctOn(['mark.toothNumber'])
      .where('mark.patientId = :patientId', { patientId })
      .orderBy('mark.toothNumber', 'ASC')
      .addOrderBy('mark.createdAt', 'DESC')
      .getMany();

    return marks.map((mark) => ({
      toothNumber: mark.toothNumber,
      condition: mark.condition,
      comment: mark.comment,
      updatedAt: mark.createdAt,
    }));
  }

  async getHistory(
    clinicId: string,
    patientId: string,
    query: ToothHistoryQueryDto,
  ): Promise<PaginatedResult<ToothMarkEntity>> {
    await assertPatientInClinic(this.patientRepository, patientId, clinicId);

    const where: FindOptionsWhere<ToothMarkEntity> = { patientId };

    if (query.toothNumber !== undefined) {
      where.toothNumber = query.toothNumber;
    }

    const [items, total] = await this.toothMarkRepository.findAndCount({
      where,
      relations: { doctorProfile: { user: true } },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { items, total, page: query.page, limit: query.limit };
  }

  async addMark(
    clinicId: string,
    patientId: string,
    user: JwtPayload,
    dto: CreateToothMarkDto,
  ): Promise<ToothMarkEntity> {
    await assertPatientInClinic(this.patientRepository, patientId, clinicId);

    const doctorProfileId = await this.resolveDoctorProfileId(clinicId, user);

    const mark = this.toothMarkRepository.create({
      patientId,
      toothNumber: dto.toothNumber,
      condition: dto.condition,
      comment: dto.comment ?? null,
      doctorProfileId,
    });

    return this.toothMarkRepository.save(mark);
  }

  async removeMark(clinicId: string, markId: string): Promise<void> {
    const mark = await this.toothMarkRepository.findOne({
      where: { id: markId, patient: { clinicId } },
    });

    if (!mark) {
      throw new NotFoundException('Tooth mark not found');
    }

    await this.toothMarkRepository.softRemove(mark);
  }

  private async resolveDoctorProfileId(
    clinicId: string,
    user: JwtPayload,
  ): Promise<string | null> {
    if (user.role !== UserRole.DOCTOR) {
      return null;
    }

    const profile = await this.doctorProfileRepository.findOne({
      where: { userId: user.sub, clinicId },
    });

    return profile ? profile.id : null;
  }
}
