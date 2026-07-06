import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { InvoiceItemEntity } from '../../entities/invoice-item.entity';
import { InvoiceEntity, InvoiceStatus } from '../../entities/invoice.entity';
import { MembershipTemplateEntity } from '../../entities/membership-template.entity';
import {
  PatientMembershipEntity,
  PatientMembershipStatus,
} from '../../entities/patient-membership.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { CreateMembershipTemplateDto } from './dto/create-membership-template.dto';
import { ListMembershipTemplatesQueryDto } from './dto/list-membership-templates-query.dto';
import { SellMembershipDto } from './dto/sell-membership.dto';
import { UpdateMembershipTemplateDto } from './dto/update-membership-template.dto';

export interface PaginatedMembershipTemplates {
  items: MembershipTemplateEntity[];
  total: number;
  page: number;
  limit: number;
}

export interface SoldMembership {
  membership: PatientMembershipEntity;
  invoice: InvoiceEntity;
}

const INVOICE_NUMBER_PADDING = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(MembershipTemplateEntity)
    private readonly templatesRepository: Repository<MembershipTemplateEntity>,
    @InjectRepository(PatientMembershipEntity)
    private readonly membershipsRepository: Repository<PatientMembershipEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
    @InjectRepository(ServiceEntity)
    private readonly servicesRepository: Repository<ServiceEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listTemplates(
    clinicId: string,
    query: ListMembershipTemplatesQueryDto,
  ): Promise<PaginatedMembershipTemplates> {
    const { page, limit, isActive } = query;

    const where: FindOptionsWhere<MembershipTemplateEntity> = { clinicId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [items, total] = await this.templatesRepository.findAndCount({
      where,
      relations: { service: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async createTemplate(
    clinicId: string,
    dto: CreateMembershipTemplateDto,
  ): Promise<MembershipTemplateEntity> {
    const service = await this.servicesRepository.findOne({
      where: { id: dto.serviceId, clinicId },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const template = this.templatesRepository.create({
      clinicId,
      name: dto.name,
      serviceId: dto.serviceId,
      totalVisits: dto.totalVisits,
      price: dto.price.toFixed(2),
      validityDays: dto.validityDays ?? null,
    });

    return this.templatesRepository.save(template);
  }

  async updateTemplate(
    clinicId: string,
    id: string,
    dto: UpdateMembershipTemplateDto,
  ): Promise<MembershipTemplateEntity> {
    const template = await this.getTemplateById(clinicId, id);

    if (dto.serviceId && dto.serviceId !== template.serviceId) {
      const service = await this.servicesRepository.findOne({
        where: { id: dto.serviceId, clinicId },
      });
      if (!service) {
        throw new NotFoundException('Service not found');
      }
    }

    const { price, ...rest } = dto;
    Object.assign(template, rest);
    if (price !== undefined) {
      template.price = price.toFixed(2);
    }

    return this.templatesRepository.save(template);
  }

  async removeTemplate(clinicId: string, id: string): Promise<void> {
    const template = await this.getTemplateById(clinicId, id);
    await this.templatesRepository.softRemove(template);
  }

  sell(clinicId: string, dto: SellMembershipDto): Promise<SoldMembership> {
    return this.dataSource.transaction(async (manager) => {
      const template = await manager.findOne(MembershipTemplateEntity, {
        where: { id: dto.templateId, clinicId },
      });
      if (!template) {
        throw new NotFoundException('Membership template not found');
      }
      if (!template.isActive) {
        throw new BadRequestException('Membership template is not active');
      }

      const patient = await manager.findOne(PatientEntity, {
        where: { id: dto.patientId, clinicId },
      });
      if (!patient) {
        throw new NotFoundException('Patient not found');
      }

      const membership = await manager.save(
        manager.create(PatientMembershipEntity, {
          patientId: dto.patientId,
          templateId: template.id,
          remainingVisits: template.totalVisits,
          expiresAt: template.validityDays
            ? new Date(Date.now() + template.validityDays * MS_PER_DAY)
            : null,
          status: PatientMembershipStatus.ACTIVE,
        }),
      );

      const price = Number(template.price).toFixed(2);
      const invoice = await manager.save(
        manager.create(InvoiceEntity, {
          clinicId,
          patientId: dto.patientId,
          appointmentId: null,
          number: await this.generateInvoiceNumber(manager, clinicId),
          status: InvoiceStatus.PENDING,
          subtotal: price,
          discountAmount: '0.00',
          total: price,
          discountId: null,
          promoCodeId: null,
          items: [
            manager.create(InvoiceItemEntity, {
              serviceId: template.serviceId,
              title: template.name,
              quantity: 1,
              price,
              amount: price,
            }),
          ],
        }),
      );

      return { membership, invoice };
    });
  }

  async getPatientMemberships(
    clinicId: string,
    patientId: string,
  ): Promise<PatientMembershipEntity[]> {
    const patient = await this.patientsRepository.findOne({
      where: { id: patientId, clinicId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return this.membershipsRepository.find({
      where: { patientId },
      relations: { template: true },
      order: { createdAt: 'DESC' },
    });
  }

  async useVisit(
    clinicId: string,
    id: string,
  ): Promise<PatientMembershipEntity> {
    const membership = await this.membershipsRepository.findOne({
      where: { id },
      relations: { patient: true, template: true },
    });
    if (!membership || membership.patient.clinicId !== clinicId) {
      throw new NotFoundException('Membership not found');
    }
    if (membership.status !== PatientMembershipStatus.ACTIVE) {
      throw new BadRequestException('Membership is not active');
    }
    if (membership.expiresAt && membership.expiresAt < new Date()) {
      membership.status = PatientMembershipStatus.EXPIRED;
      await this.membershipsRepository.save(membership);
      throw new BadRequestException('Membership has expired');
    }
    if (membership.remainingVisits <= 0) {
      throw new BadRequestException('No visits remaining');
    }

    membership.remainingVisits -= 1;
    if (membership.remainingVisits === 0) {
      membership.status = PatientMembershipStatus.USED_UP;
    }

    return this.membershipsRepository.save(membership);
  }

  private async getTemplateById(
    clinicId: string,
    id: string,
  ): Promise<MembershipTemplateEntity> {
    const template = await this.templatesRepository.findOne({
      where: { id, clinicId },
      relations: { service: true },
    });
    if (!template) {
      throw new NotFoundException('Membership template not found');
    }
    return template;
  }

  private async generateInvoiceNumber(
    manager: EntityManager,
    clinicId: string,
  ): Promise<string> {
    const count = await manager.count(InvoiceEntity, { where: { clinicId } });
    return `INV-${String(count + 1).padStart(INVOICE_NUMBER_PADDING, '0')}`;
  }
}
