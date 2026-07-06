import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { BranchEntity } from '../../entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { ListBranchesQueryDto } from './dto/list-branches-query.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

export interface PaginatedBranches {
  items: BranchEntity[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchesRepository: Repository<BranchEntity>,
  ) {}

  async list(
    clinicId: string,
    query: ListBranchesQueryDto,
  ): Promise<PaginatedBranches> {
    const { page, limit, search, isActive } = query;

    const where: FindOptionsWhere<BranchEntity> = { clinicId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (search) {
      where.name = ILike(`%${search}%`);
    }

    const [items, total] = await this.branchesRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getById(clinicId: string, id: string): Promise<BranchEntity> {
    const branch = await this.branchesRepository.findOne({
      where: { id, clinicId },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  create(clinicId: string, dto: CreateBranchDto): Promise<BranchEntity> {
    const branch = this.branchesRepository.create({ ...dto, clinicId });
    return this.branchesRepository.save(branch);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateBranchDto,
  ): Promise<BranchEntity> {
    const branch = await this.getById(clinicId, id);
    Object.assign(branch, dto);
    return this.branchesRepository.save(branch);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const branch = await this.getById(clinicId, id);
    await this.branchesRepository.softRemove(branch);
  }
}
