import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { DiscountEntity } from '../../entities/discount.entity';
import { PromotionEntity } from '../../entities/promotion.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ListPromotionsQueryDto } from './dto/list-promotions-query.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PaginatedResult } from './types/paginated-result.type';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(PromotionEntity)
    private readonly promotionsRepository: Repository<PromotionEntity>,
    @InjectRepository(DiscountEntity)
    private readonly discountsRepository: Repository<DiscountEntity>,
  ) {}

  async findAll(
    clinicId: string,
    query: ListPromotionsQueryDto,
  ): Promise<PaginatedResult<PromotionEntity>> {
    const { page, limit, isActive } = query;

    const where: FindOptionsWhere<PromotionEntity> = { clinicId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await this.promotionsRepository.findAndCount({
      where,
      relations: { discount: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(clinicId: string, id: string): Promise<PromotionEntity> {
    const promotion = await this.promotionsRepository.findOne({
      where: { id, clinicId },
      relations: { discount: true },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    return promotion;
  }

  async create(
    clinicId: string,
    dto: CreatePromotionDto,
  ): Promise<PromotionEntity> {
    if (dto.discountId) {
      await this.assertDiscountBelongsToClinic(clinicId, dto.discountId);
    }

    const promotion = this.promotionsRepository.create({
      clinicId,
      title: dto.title,
      description: dto.description ?? null,
      discountId: dto.discountId ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.promotionsRepository.save(promotion);
    return this.findOne(clinicId, saved.id);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdatePromotionDto,
  ): Promise<PromotionEntity> {
    const promotion = await this.findOne(clinicId, id);

    if (dto.discountId) {
      await this.assertDiscountBelongsToClinic(clinicId, dto.discountId);
    }

    if (dto.title !== undefined) {
      promotion.title = dto.title;
    }

    if (dto.description !== undefined) {
      promotion.description = dto.description;
    }

    if (dto.discountId !== undefined) {
      promotion.discountId = dto.discountId;
    }

    if (dto.startsAt !== undefined) {
      promotion.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    }

    if (dto.endsAt !== undefined) {
      promotion.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    }

    if (dto.isActive !== undefined) {
      promotion.isActive = dto.isActive;
    }

    await this.promotionsRepository.save(promotion);
    return this.findOne(clinicId, id);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const promotion = await this.findOne(clinicId, id);
    await this.promotionsRepository.softRemove(promotion);
  }

  private async assertDiscountBelongsToClinic(
    clinicId: string,
    discountId: string,
  ): Promise<void> {
    const discount = await this.discountsRepository.findOne({
      where: { id: discountId, clinicId },
    });

    if (!discount) {
      throw new BadRequestException('Discount does not belong to this clinic');
    }
  }
}
