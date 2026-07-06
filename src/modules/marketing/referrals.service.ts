import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PatientEntity } from '../../entities/patient.entity';
import { ReferralEntity } from '../../entities/referral.entity';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ListReferralsQueryDto } from './dto/list-referrals-query.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { PaginatedResult } from './types/paginated-result.type';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(ReferralEntity)
    private readonly referralsRepository: Repository<ReferralEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
  ) {}

  async findAll(
    clinicId: string,
    query: ListReferralsQueryDto,
  ): Promise<PaginatedResult<ReferralEntity>> {
    const { page, limit, status } = query;

    const where: FindOptionsWhere<ReferralEntity> = { clinicId };

    if (status !== undefined) {
      where.status = status;
    }

    const [items, total] = await this.referralsRepository.findAndCount({
      where,
      relations: { referrerPatient: true, referredPatient: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(clinicId: string, id: string): Promise<ReferralEntity> {
    const referral = await this.referralsRepository.findOne({
      where: { id, clinicId },
      relations: { referrerPatient: true, referredPatient: true },
    });

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    return referral;
  }

  async create(
    clinicId: string,
    dto: CreateReferralDto,
  ): Promise<ReferralEntity> {
    await this.assertPatientBelongsToClinic(clinicId, dto.referrerPatientId);

    const referral = this.referralsRepository.create({
      clinicId,
      referrerPatientId: dto.referrerPatientId,
      rewardAmount: dto.rewardAmount ?? null,
    });

    const saved = await this.referralsRepository.save(referral);
    return this.findOne(clinicId, saved.id);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateReferralDto,
  ): Promise<ReferralEntity> {
    const referral = await this.findOne(clinicId, id);

    if (dto.referredPatientId) {
      await this.assertPatientBelongsToClinic(clinicId, dto.referredPatientId);
    }

    if (dto.referredPatientId !== undefined) {
      referral.referredPatientId = dto.referredPatientId;
    }

    if (dto.status !== undefined) {
      referral.status = dto.status;
    }

    if (dto.rewardAmount !== undefined) {
      referral.rewardAmount = dto.rewardAmount;
    }

    await this.referralsRepository.save(referral);
    return this.findOne(clinicId, id);
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
}
