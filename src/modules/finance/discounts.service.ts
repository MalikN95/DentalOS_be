import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { DiscountEntity, DiscountType } from '../../entities/discount.entity';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { ListDiscountsQueryDto } from './dto/list-discounts-query.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { toMoney } from './money';

export interface PaginatedDiscounts {
  items: DiscountEntity[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class DiscountsService {
  constructor(
    @InjectRepository(DiscountEntity)
    private readonly discountsRepository: Repository<DiscountEntity>,
  ) {}

  async list(
    clinicId: string,
    query: ListDiscountsQueryDto,
  ): Promise<PaginatedDiscounts> {
    const { page, limit, isActive } = query;

    const where: FindOptionsWhere<DiscountEntity> = { clinicId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await this.discountsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getById(clinicId: string, id: string): Promise<DiscountEntity> {
    const discount = await this.discountsRepository.findOne({
      where: { id, clinicId },
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    return discount;
  }

  create(clinicId: string, dto: CreateDiscountDto): Promise<DiscountEntity> {
    this.assertValue(dto.type, dto.value);

    const discount = this.discountsRepository.create({
      clinicId,
      name: dto.name,
      type: dto.type,
      value: toMoney(dto.value),
      validFrom: dto.validFrom ?? null,
      validTo: dto.validTo ?? null,
      isActive: dto.isActive ?? true,
    });

    return this.discountsRepository.save(discount);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateDiscountDto,
  ): Promise<DiscountEntity> {
    const discount = await this.getById(clinicId, id);

    const type = dto.type ?? discount.type;
    const value = dto.value !== undefined ? dto.value : Number(discount.value);
    this.assertValue(type, value);

    Object.assign(discount, {
      ...dto,
      type,
      value: toMoney(value),
    });

    return this.discountsRepository.save(discount);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const discount = await this.getById(clinicId, id);
    await this.discountsRepository.softRemove(discount);
  }

  private assertValue(type: DiscountType, value: number): void {
    if (type === DiscountType.PERCENT && value > 100) {
      throw new BadRequestException('Percent discount cannot exceed 100');
    }
  }
}
