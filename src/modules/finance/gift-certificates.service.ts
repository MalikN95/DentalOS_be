import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  GiftCertificateEntity,
  GiftCertificateStatus,
} from '../../entities/gift-certificate.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { CreateGiftCertificateDto } from './dto/create-gift-certificate.dto';
import { ListGiftCertificatesQueryDto } from './dto/list-gift-certificates-query.dto';
import { toMoney } from './money';

export interface PaginatedGiftCertificates {
  items: GiftCertificateEntity[];
  total: number;
  page: number;
  limit: number;
}

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 12;
const CODE_GENERATION_ATTEMPTS = 5;

@Injectable()
export class GiftCertificatesService {
  constructor(
    @InjectRepository(GiftCertificateEntity)
    private readonly certificatesRepository: Repository<GiftCertificateEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
  ) {}

  async list(
    clinicId: string,
    query: ListGiftCertificatesQueryDto,
  ): Promise<PaginatedGiftCertificates> {
    const { page, limit, status } = query;

    const where: FindOptionsWhere<GiftCertificateEntity> = { clinicId };
    if (status) {
      where.status = status;
    }

    const [items, total] = await this.certificatesRepository.findAndCount({
      where,
      relations: { patient: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async create(
    clinicId: string,
    dto: CreateGiftCertificateDto,
  ): Promise<GiftCertificateEntity> {
    if (dto.patientId) {
      const patient = await this.patientsRepository.findOne({
        where: { id: dto.patientId, clinicId },
      });
      if (!patient) {
        throw new NotFoundException('Patient not found');
      }
    }

    const code = dto.code
      ? await this.assertCodeAvailable(clinicId, dto.code)
      : await this.generateCode(clinicId);

    const amount = toMoney(dto.initialAmount);
    const certificate = this.certificatesRepository.create({
      clinicId,
      code,
      initialAmount: amount,
      balance: amount,
      status: GiftCertificateStatus.ACTIVE,
      expiresAt: dto.expiresAt ?? null,
      patientId: dto.patientId ?? null,
    });

    return this.certificatesRepository.save(certificate);
  }

  async cancel(clinicId: string, id: string): Promise<GiftCertificateEntity> {
    const certificate = await this.certificatesRepository.findOne({
      where: { id, clinicId },
    });

    if (!certificate) {
      throw new NotFoundException('Gift certificate not found');
    }
    if (certificate.status !== GiftCertificateStatus.ACTIVE) {
      throw new BadRequestException(
        'Only active gift certificates can be cancelled',
      );
    }

    certificate.status = GiftCertificateStatus.CANCELLED;
    return this.certificatesRepository.save(certificate);
  }

  private async assertCodeAvailable(
    clinicId: string,
    code: string,
  ): Promise<string> {
    const existing = await this.certificatesRepository.findOne({
      where: { clinicId, code },
    });
    if (existing) {
      throw new ConflictException('Gift certificate code already exists');
    }
    return code;
  }

  private async generateCode(clinicId: string, attempt = 0): Promise<string> {
    if (attempt >= CODE_GENERATION_ATTEMPTS) {
      throw new ConflictException(
        'Failed to generate a unique certificate code',
      );
    }

    const bytes = randomBytes(CODE_LENGTH);
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }

    const existing = await this.certificatesRepository.findOne({
      where: { clinicId, code },
    });

    if (existing) {
      return this.generateCode(clinicId, attempt + 1);
    }

    return code;
  }
}
