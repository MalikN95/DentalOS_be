import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCategoryEntity } from '../../entities/service-category.entity';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { PaginatedResult } from './types/paginated-result.type';

@Injectable()
export class ServiceCategoriesService {
  constructor(
    @InjectRepository(ServiceCategoryEntity)
    private readonly categoriesRepository: Repository<ServiceCategoryEntity>,
  ) {}

  async findAll(
    clinicId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<ServiceCategoryEntity>> {
    const { page, limit } = query;

    const [items, total] = await this.categoriesRepository.findAndCount({
      where: { clinicId },
      order: { sortOrder: 'ASC', name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(clinicId: string, id: string): Promise<ServiceCategoryEntity> {
    const category = await this.categoriesRepository.findOne({
      where: { id, clinicId },
    });

    if (!category) {
      throw new NotFoundException('Service category not found');
    }

    return category;
  }

  create(
    clinicId: string,
    dto: CreateServiceCategoryDto,
  ): Promise<ServiceCategoryEntity> {
    const category = this.categoriesRepository.create({ ...dto, clinicId });
    return this.categoriesRepository.save(category);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategoryEntity> {
    const category = await this.findOne(clinicId, id);
    this.categoriesRepository.merge(category, dto);
    return this.categoriesRepository.save(category);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const category = await this.findOne(clinicId, id);
    await this.categoriesRepository.softRemove(category);
  }
}
