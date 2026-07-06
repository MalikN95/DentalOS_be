import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PromoCodeEntity } from '../../entities/promo-code.entity';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { ListPromoCodesQueryDto } from './dto/list-promo-codes-query.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { PaginatedResult } from './types/paginated-result.type';
import { PromoCodeValidationResult } from './types/promo-code-validation-result.type';

const CODE_LENGTH = 8;
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const GENERATION_ATTEMPTS = 10;

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectRepository(PromoCodeEntity)
    private readonly promoCodesRepository: Repository<PromoCodeEntity>,
  ) {}

  async findAll(
    clinicId: string,
    query: ListPromoCodesQueryDto,
  ): Promise<PaginatedResult<PromoCodeEntity>> {
    const { page, limit, isActive } = query;

    const where: FindOptionsWhere<PromoCodeEntity> = { clinicId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await this.promoCodesRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(clinicId: string, id: string): Promise<PromoCodeEntity> {
    const promoCode = await this.promoCodesRepository.findOne({
      where: { id, clinicId },
    });

    if (!promoCode) {
      throw new NotFoundException('Promo code not found');
    }

    return promoCode;
  }

  async create(
    clinicId: string,
    dto: CreatePromoCodeDto,
  ): Promise<PromoCodeEntity> {
    const code = dto.code
      ? await this.assertCodeIsUnique(clinicId, dto.code)
      : await this.generateUniqueCode(clinicId);

    const promoCode = this.promoCodesRepository.create({
      clinicId,
      code,
      type: dto.type,
      value: dto.value,
      maxUses: dto.maxUses ?? null,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validTo: dto.validTo ? new Date(dto.validTo) : null,
      isActive: dto.isActive ?? true,
    });

    return this.promoCodesRepository.save(promoCode);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdatePromoCodeDto,
  ): Promise<PromoCodeEntity> {
    const promoCode = await this.findOne(clinicId, id);

    if (dto.code !== undefined && dto.code !== promoCode.code) {
      promoCode.code = await this.assertCodeIsUnique(clinicId, dto.code);
    }

    if (dto.type !== undefined) {
      promoCode.type = dto.type;
    }

    if (dto.value !== undefined) {
      promoCode.value = dto.value;
    }

    if (dto.maxUses !== undefined) {
      promoCode.maxUses = dto.maxUses;
    }

    if (dto.validFrom !== undefined) {
      promoCode.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    }

    if (dto.validTo !== undefined) {
      promoCode.validTo = dto.validTo ? new Date(dto.validTo) : null;
    }

    if (dto.isActive !== undefined) {
      promoCode.isActive = dto.isActive;
    }

    return this.promoCodesRepository.save(promoCode);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const promoCode = await this.findOne(clinicId, id);
    await this.promoCodesRepository.softRemove(promoCode);
  }

  async validate(
    clinicId: string,
    code: string,
  ): Promise<PromoCodeValidationResult> {
    const promoCode = await this.promoCodesRepository.findOne({
      where: { clinicId, code: code.toUpperCase() },
    });

    if (!promoCode) {
      return { valid: false, reason: 'Promo code not found' };
    }

    if (!promoCode.isActive) {
      return { valid: false, reason: 'Promo code is inactive' };
    }

    const now = new Date();

    if (promoCode.validFrom && promoCode.validFrom > now) {
      return { valid: false, reason: 'Promo code is not yet valid' };
    }

    if (promoCode.validTo && promoCode.validTo < now) {
      return { valid: false, reason: 'Promo code has expired' };
    }

    if (
      promoCode.maxUses !== null &&
      promoCode.usedCount >= promoCode.maxUses
    ) {
      return { valid: false, reason: 'Promo code usage limit reached' };
    }

    return { valid: true, type: promoCode.type, value: promoCode.value };
  }

  private async assertCodeIsUnique(
    clinicId: string,
    code: string,
  ): Promise<string> {
    const normalized = code.toUpperCase();

    const existing = await this.promoCodesRepository.findOne({
      where: { clinicId, code: normalized },
    });

    if (existing) {
      throw new ConflictException(
        'Promo code with this code already exists in the clinic',
      );
    }

    return normalized;
  }

  private async generateUniqueCode(
    clinicId: string,
    attempt = 0,
  ): Promise<string> {
    if (attempt >= GENERATION_ATTEMPTS) {
      throw new ConflictException('Failed to generate a unique promo code');
    }

    const code = this.generateCode();
    const existing = await this.promoCodesRepository.findOne({
      where: { clinicId, code },
    });

    if (existing) {
      return this.generateUniqueCode(clinicId, attempt + 1);
    }

    return code;
  }

  private generateCode(): string {
    const bytes = randomBytes(CODE_LENGTH);
    let code = '';

    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }

    return code;
  }
}
