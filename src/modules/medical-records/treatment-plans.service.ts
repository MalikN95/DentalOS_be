import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { TreatmentPlanItemEntity } from '../../entities/treatment-plan-item.entity';
import { TreatmentPlanEntity } from '../../entities/treatment-plan.entity';
import { CreateTreatmentPlanItemDto } from './dto/create-treatment-plan-item.dto';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { ListTreatmentPlansQueryDto } from './dto/list-treatment-plans-query.dto';
import { ReplaceTreatmentPlanItemsDto } from './dto/replace-treatment-plan-items.dto';
import { UpdateTreatmentPlanItemDto } from './dto/update-treatment-plan-item.dto';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto';
import { assertPatientInClinic } from './helpers/assert-patient-in-clinic.helper';
import { resolveDoctorProfileId } from './helpers/resolve-doctor-profile-id.helper';
import { PaginatedResult } from './types/paginated-result.type';

@Injectable()
export class TreatmentPlansService {
  constructor(
    @InjectRepository(TreatmentPlanEntity)
    private readonly planRepository: Repository<TreatmentPlanEntity>,
    @InjectRepository(TreatmentPlanItemEntity)
    private readonly itemRepository: Repository<TreatmentPlanItemEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientRepository: Repository<PatientEntity>,
    @InjectRepository(DoctorProfileEntity)
    private readonly doctorProfileRepository: Repository<DoctorProfileEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    clinicId: string,
    query: ListTreatmentPlansQueryDto,
  ): Promise<PaginatedResult<TreatmentPlanEntity>> {
    if (query.patientId) {
      await assertPatientInClinic(
        this.patientRepository,
        query.patientId,
        clinicId,
      );
    }

    // Clinic scoping goes through the patient relation: TreatmentPlanEntity
    // has no clinicId column of its own.
    const where: FindOptionsWhere<TreatmentPlanEntity> = {
      patient: { clinicId },
    };

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.createdFrom && query.createdTo) {
      where.createdAt = Between(
        new Date(query.createdFrom),
        new Date(query.createdTo),
      );
    } else if (query.createdFrom) {
      where.createdAt = MoreThanOrEqual(new Date(query.createdFrom));
    } else if (query.createdTo) {
      where.createdAt = LessThanOrEqual(new Date(query.createdTo));
    }

    const [items, total] = await this.planRepository.findAndCount({
      where,
      relations: {
        patient: true,
        items: { service: true },
        doctorProfile: { user: true },
      },
      order: { createdAt: 'DESC', items: { sortOrder: 'ASC' } },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return { items, total, page: query.page, limit: query.limit };
  }

  async findOne(clinicId: string, id: string): Promise<TreatmentPlanEntity> {
    const plan = await this.planRepository.findOne({
      where: { id, patient: { clinicId } },
      relations: { items: { service: true }, doctorProfile: { user: true } },
      order: { items: { sortOrder: 'ASC' } },
    });

    if (!plan) {
      throw new NotFoundException('Treatment plan not found');
    }

    return plan;
  }

  async create(
    clinicId: string,
    user: JwtPayload,
    dto: CreateTreatmentPlanDto,
  ): Promise<TreatmentPlanEntity> {
    await assertPatientInClinic(
      this.patientRepository,
      dto.patientId,
      clinicId,
    );

    const doctorProfileId = await resolveDoctorProfileId(
      this.doctorProfileRepository,
      clinicId,
      user,
      dto.doctorProfileId,
    );

    const serviceById = await this.loadServices(clinicId, dto.items);

    const plan = this.planRepository.create({
      patientId: dto.patientId,
      doctorProfileId,
      title: dto.title,
      notes: dto.notes ?? null,
      items: dto.items.map((item, index) =>
        this.buildItem(item, index, serviceById),
      ),
    });

    const saved = await this.planRepository.save(plan);

    return this.findOne(clinicId, saved.id);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateTreatmentPlanDto,
  ): Promise<TreatmentPlanEntity> {
    const plan = await this.findOne(clinicId, id);

    if (dto.title !== undefined) {
      plan.title = dto.title;
    }
    if (dto.notes !== undefined) {
      plan.notes = dto.notes;
    }
    if (dto.status !== undefined) {
      plan.status = dto.status;
    }

    await this.planRepository.save(plan);

    return this.findOne(clinicId, id);
  }

  async replaceItems(
    clinicId: string,
    id: string,
    dto: ReplaceTreatmentPlanItemsDto,
  ): Promise<TreatmentPlanEntity> {
    const plan = await this.findOne(clinicId, id);
    const serviceById = await this.loadServices(clinicId, dto.items);

    await this.dataSource.transaction(async (manager) => {
      const itemRepository = manager.getRepository(TreatmentPlanItemEntity);

      await itemRepository.softDelete({ planId: plan.id });

      if (dto.items.length > 0) {
        const items = dto.items.map((item, index) =>
          itemRepository.create({
            planId: plan.id,
            ...this.buildItem(item, index, serviceById),
          }),
        );

        await itemRepository.save(items);
      }
    });

    return this.findOne(clinicId, id);
  }

  async updateItem(
    clinicId: string,
    itemId: string,
    dto: UpdateTreatmentPlanItemDto,
  ): Promise<TreatmentPlanItemEntity> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId, plan: { patient: { clinicId } } },
      relations: { service: true },
    });

    if (!item) {
      throw new NotFoundException('Treatment plan item not found');
    }

    item.status = dto.status;

    return this.itemRepository.save(item);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const plan = await this.findOne(clinicId, id);

    await this.planRepository.softRemove(plan);
  }

  private async loadServices(
    clinicId: string,
    items: CreateTreatmentPlanItemDto[],
  ): Promise<Map<string, ServiceEntity>> {
    const serviceIds = [...new Set(items.map((item) => item.serviceId))];

    if (serviceIds.length === 0) {
      return new Map();
    }

    const services = await this.serviceRepository.find({
      where: { id: In(serviceIds), clinicId },
    });
    const serviceById = new Map(
      services.map((service) => [service.id, service]),
    );

    const missingServiceId = serviceIds.find(
      (serviceId) => !serviceById.has(serviceId),
    );

    if (missingServiceId) {
      throw new NotFoundException(
        `Service ${missingServiceId} not found in this clinic`,
      );
    }

    return serviceById;
  }

  private buildItem(
    item: CreateTreatmentPlanItemDto,
    index: number,
    serviceById: Map<string, ServiceEntity>,
  ): Partial<TreatmentPlanItemEntity> {
    const service = serviceById.get(item.serviceId);

    if (!service) {
      throw new NotFoundException(
        `Service ${item.serviceId} not found in this clinic`,
      );
    }

    return {
      serviceId: item.serviceId,
      toothNumber: item.toothNumber ?? null,
      price: item.price ?? service.price,
      sortOrder: item.sortOrder ?? index,
    };
  }
}
