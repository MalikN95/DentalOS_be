import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { BranchEntity } from '../../entities/branch.entity';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { CreateCabinetDto } from './dto/create-cabinet.dto';
import { ListCabinetsQueryDto } from './dto/list-cabinets-query.dto';
import { UpdateCabinetDto } from './dto/update-cabinet.dto';

export interface PaginatedCabinets {
  items: CabinetEntity[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class CabinetsService {
  constructor(
    @InjectRepository(CabinetEntity)
    private readonly cabinetsRepository: Repository<CabinetEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchesRepository: Repository<BranchEntity>,
  ) {}

  async list(
    clinicId: string,
    query: ListCabinetsQueryDto,
  ): Promise<PaginatedCabinets> {
    const { page, limit, branchId, search } = query;

    const where: FindOptionsWhere<CabinetEntity> = {
      branch: { clinicId },
    };
    if (branchId) {
      where.branchId = branchId;
    }
    if (search) {
      where.name = ILike(`%${search}%`);
    }

    const [items, total] = await this.cabinetsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getById(clinicId: string, id: string): Promise<CabinetEntity> {
    const cabinet = await this.cabinetsRepository.findOne({
      where: { id, branch: { clinicId } },
    });

    if (!cabinet) {
      throw new NotFoundException('Cabinet not found');
    }

    return cabinet;
  }

  async create(
    clinicId: string,
    dto: CreateCabinetDto,
  ): Promise<CabinetEntity> {
    await this.assertBranchInClinic(dto.branchId, clinicId);

    const cabinet = this.cabinetsRepository.create(dto);
    return this.cabinetsRepository.save(cabinet);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateCabinetDto,
  ): Promise<CabinetEntity> {
    const cabinet = await this.getById(clinicId, id);

    if (dto.branchId && dto.branchId !== cabinet.branchId) {
      await this.assertBranchInClinic(dto.branchId, clinicId);
    }

    Object.assign(cabinet, dto);
    return this.cabinetsRepository.save(cabinet);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const cabinet = await this.getById(clinicId, id);
    await this.cabinetsRepository.softRemove(cabinet);
  }

  private async assertBranchInClinic(
    branchId: string,
    clinicId: string,
  ): Promise<void> {
    const branch = await this.branchesRepository.findOne({
      where: { id: branchId, clinicId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  }
}
