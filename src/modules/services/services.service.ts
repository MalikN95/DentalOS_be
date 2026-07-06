import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { ServiceCategoryEntity } from '../../entities/service-category.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { ListServicesQueryDto } from './dto/list-services-query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PaginatedResult } from './types/paginated-result.type';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly servicesRepository: Repository<ServiceEntity>,
    @InjectRepository(ServiceCategoryEntity)
    private readonly categoriesRepository: Repository<ServiceCategoryEntity>,
    @InjectRepository(CabinetEntity)
    private readonly cabinetsRepository: Repository<CabinetEntity>,
  ) {}

  async findAll(
    clinicId: string,
    query: ListServicesQueryDto,
  ): Promise<PaginatedResult<ServiceEntity>> {
    const { page, limit, categoryId, search, isActive } = query;

    const where: FindOptionsWhere<ServiceEntity> = { clinicId };

    if (categoryId !== undefined) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.name = ILike(`%${search}%`);
    }

    const [items, total] = await this.servicesRepository.findAndCount({
      where,
      relations: { category: true },
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(clinicId: string, id: string): Promise<ServiceEntity> {
    const service = await this.servicesRepository.findOne({
      where: { id, clinicId },
      relations: { category: true, allowedCabinets: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async create(
    clinicId: string,
    dto: CreateServiceDto,
  ): Promise<ServiceEntity> {
    const { allowedCabinetIds, categoryId, ...rest } = dto;

    if (categoryId) {
      await this.assertCategoryBelongsToClinic(clinicId, categoryId);
    }

    const service = this.servicesRepository.create({
      ...rest,
      categoryId: categoryId ?? null,
      requiredEquipmentTypes: dto.requiredEquipmentTypes ?? [],
      allowedCabinets: await this.resolveCabinets(
        clinicId,
        allowedCabinetIds ?? [],
      ),
      clinicId,
    });

    const saved = await this.servicesRepository.save(service);
    return this.findOne(clinicId, saved.id);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceEntity> {
    const service = await this.findOne(clinicId, id);
    const { allowedCabinetIds, categoryId, ...rest } = dto;

    if (categoryId) {
      await this.assertCategoryBelongsToClinic(clinicId, categoryId);
    }

    this.servicesRepository.merge(service, rest);

    if (categoryId !== undefined) {
      service.categoryId = categoryId;
    }

    if (allowedCabinetIds !== undefined) {
      service.allowedCabinets = await this.resolveCabinets(
        clinicId,
        allowedCabinetIds,
      );
    }

    await this.servicesRepository.save(service);
    return this.findOne(clinicId, id);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const service = await this.findOne(clinicId, id);
    await this.servicesRepository.softRemove(service);
  }

  private async assertCategoryBelongsToClinic(
    clinicId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId, clinicId },
    });

    if (!category) {
      throw new BadRequestException(
        'Service category does not belong to this clinic',
      );
    }
  }

  private async resolveCabinets(
    clinicId: string,
    cabinetIds: string[],
  ): Promise<CabinetEntity[]> {
    const uniqueIds = [...new Set(cabinetIds)];

    if (uniqueIds.length === 0) {
      return [];
    }

    const cabinets = await this.cabinetsRepository.find({
      where: { id: In(uniqueIds), branch: { clinicId } },
    });

    if (cabinets.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more cabinets do not belong to this clinic',
      );
    }

    return cabinets;
  }
}
