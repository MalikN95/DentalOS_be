import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { BranchEntity } from '../../entities/branch.entity';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { EquipmentEntity } from '../../entities/equipment.entity';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { ListEquipmentQueryDto } from './dto/list-equipment-query.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';

export interface PaginatedEquipment {
  items: EquipmentEntity[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(EquipmentEntity)
    private readonly equipmentRepository: Repository<EquipmentEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchesRepository: Repository<BranchEntity>,
    @InjectRepository(CabinetEntity)
    private readonly cabinetsRepository: Repository<CabinetEntity>,
  ) {}

  async list(
    clinicId: string,
    query: ListEquipmentQueryDto,
  ): Promise<PaginatedEquipment> {
    const { page, limit, branchId, cabinetId, status } = query;

    const where: FindOptionsWhere<EquipmentEntity> = {
      branch: { clinicId },
    };
    if (branchId) {
      where.branchId = branchId;
    }
    if (cabinetId) {
      where.cabinetId = cabinetId;
    }
    if (status) {
      where.status = status;
    }

    const [items, total] = await this.equipmentRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getById(clinicId: string, id: string): Promise<EquipmentEntity> {
    const equipment = await this.equipmentRepository.findOne({
      where: { id, branch: { clinicId } },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    return equipment;
  }

  async create(
    clinicId: string,
    dto: CreateEquipmentDto,
  ): Promise<EquipmentEntity> {
    await this.assertBranchInClinic(dto.branchId, clinicId);

    if (dto.cabinetId) {
      await this.assertCabinetInBranch(dto.cabinetId, dto.branchId);
    }

    const equipment = this.equipmentRepository.create(dto);
    return this.equipmentRepository.save(equipment);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateEquipmentDto,
  ): Promise<EquipmentEntity> {
    const equipment = await this.getById(clinicId, id);

    const targetBranchId = dto.branchId ?? equipment.branchId;
    if (dto.branchId && dto.branchId !== equipment.branchId) {
      await this.assertBranchInClinic(dto.branchId, clinicId);
    }

    const targetCabinetId =
      dto.cabinetId !== undefined ? dto.cabinetId : equipment.cabinetId;
    if (targetCabinetId) {
      await this.assertCabinetInBranch(targetCabinetId, targetBranchId);
    }

    Object.assign(equipment, dto);
    return this.equipmentRepository.save(equipment);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const equipment = await this.getById(clinicId, id);
    await this.equipmentRepository.softRemove(equipment);
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

  private async assertCabinetInBranch(
    cabinetId: string,
    branchId: string,
  ): Promise<void> {
    const cabinet = await this.cabinetsRepository.findOne({
      where: { id: cabinetId, branchId },
    });

    if (!cabinet) {
      throw new NotFoundException('Cabinet not found in the given branch');
    }
  }
}
