import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { DiscountEntity, DiscountType } from '../../entities/discount.entity';
import { InvoiceItemEntity } from '../../entities/invoice-item.entity';
import { InvoiceEntity, InvoiceStatus } from '../../entities/invoice.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { PaymentEntity } from '../../entities/payment.entity';
import { PromoCodeEntity } from '../../entities/promo-code.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateInvoiceDto,
  InvoiceItemInputDto,
} from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { moneyAdd, moneyPercent, moneySub, toMoney } from './money';

export interface PaginatedInvoices {
  items: InvoiceEntity[];
  total: number;
  page: number;
  limit: number;
}

export type InvoiceWithPayments = InvoiceEntity & {
  payments: PaymentEntity[];
};

const INVOICE_NUMBER_PADDING = 6;

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoicesRepository: Repository<InvoiceEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(
    clinicId: string,
    query: ListInvoicesQueryDto,
  ): Promise<PaginatedInvoices> {
    const { page, limit, patientId, status, from, to } = query;

    const where: FindOptionsWhere<InvoiceEntity> = { clinicId };
    if (patientId) {
      where.patientId = patientId;
    }
    if (status) {
      where.status = status;
    }
    if (from && to) {
      where.createdAt = Between(from, to);
    } else if (from) {
      where.createdAt = MoreThanOrEqual(from);
    } else if (to) {
      where.createdAt = LessThanOrEqual(to);
    }

    const [items, total] = await this.invoicesRepository.findAndCount({
      where,
      relations: { patient: true, items: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getById(clinicId: string, id: string): Promise<InvoiceWithPayments> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id, clinicId },
      relations: {
        patient: true,
        items: true,
        discount: true,
        promoCode: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const payments = await this.paymentsRepository.find({
      where: { invoiceId: id },
      order: { createdAt: 'ASC' },
    });

    return Object.assign(invoice, { payments });
  }

  async create(
    clinicId: string,
    dto: CreateInvoiceDto,
  ): Promise<InvoiceEntity> {
    if (dto.discountId && dto.promoCode) {
      throw new BadRequestException(
        'Provide either discountId or promoCode, not both',
      );
    }

    const { invoice, patient } = await this.dataSource.transaction(
      async (manager) => {
        const invoicePatient = await manager.findOne(PatientEntity, {
          where: { id: dto.patientId, clinicId },
        });
        if (!invoicePatient) {
          throw new NotFoundException('Patient not found');
        }

        if (dto.appointmentId) {
          const appointment = await manager.findOne(AppointmentEntity, {
            where: { id: dto.appointmentId, clinicId },
          });
          if (!appointment) {
            throw new NotFoundException('Appointment not found');
          }
        }

        const items = await this.buildItems(manager, clinicId, dto.items);
        const subtotal = items.reduce(
          (sum, item) => moneyAdd(sum, item.amount),
          '0.00',
        );

        const { discountAmount, discountId, promoCodeId } =
          await this.resolveDiscount(manager, clinicId, dto, subtotal);

        const total = moneySub(subtotal, discountAmount);

        const createdInvoice = manager.create(InvoiceEntity, {
          clinicId,
          patientId: dto.patientId,
          appointmentId: dto.appointmentId ?? null,
          number: await this.generateNumber(manager, clinicId),
          status: InvoiceStatus.PENDING,
          subtotal,
          discountAmount,
          total,
          discountId,
          promoCodeId,
          items,
        });

        const saved = await manager.save(createdInvoice);

        return { invoice: saved, patient: invoicePatient };
      },
    );

    await this.notificationsService.notifyPatient(patient, {
      subject: 'Выставлен счёт',
      body: `Вам выставлен счёт №${invoice.number} на сумму ${invoice.total}.`,
    });

    return invoice;
  }

  async cancel(clinicId: string, id: string): Promise<InvoiceEntity> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id, clinicId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new BadRequestException('Only pending invoices can be cancelled');
    }

    invoice.status = InvoiceStatus.CANCELLED;
    return this.invoicesRepository.save(invoice);
  }

  private async buildItems(
    manager: EntityManager,
    clinicId: string,
    inputs: InvoiceItemInputDto[],
  ): Promise<InvoiceItemEntity[]> {
    return Promise.all(
      inputs.map(async (input) => {
        let { title } = input;
        let price =
          input.price !== undefined ? toMoney(input.price) : undefined;

        if (input.serviceId) {
          const service = await manager.findOne(ServiceEntity, {
            where: { id: input.serviceId, clinicId },
          });
          if (!service) {
            throw new NotFoundException('Service not found');
          }
          title = title ?? service.name;
          price = price ?? toMoney(service.price);
        }

        if (title === undefined || price === undefined) {
          throw new BadRequestException(
            'Invoice item requires either serviceId or both title and price',
          );
        }

        return manager.create(InvoiceItemEntity, {
          serviceId: input.serviceId ?? null,
          title,
          quantity: input.quantity,
          price,
          amount: toMoney(Number(price) * input.quantity),
        });
      }),
    );
  }

  private async resolveDiscount(
    manager: EntityManager,
    clinicId: string,
    dto: CreateInvoiceDto,
    subtotal: string,
  ): Promise<{
    discountAmount: string;
    discountId: string | null;
    promoCodeId: string | null;
  }> {
    const now = new Date();

    if (dto.discountId) {
      const discount = await manager.findOne(DiscountEntity, {
        where: { id: dto.discountId, clinicId },
      });
      if (!discount) {
        throw new NotFoundException('Discount not found');
      }
      if (
        !discount.isActive ||
        (discount.validFrom && discount.validFrom > now) ||
        (discount.validTo && discount.validTo < now)
      ) {
        throw new BadRequestException('Discount is not active');
      }

      return {
        discountAmount: this.applyDiscount(
          subtotal,
          discount.type,
          discount.value,
        ),
        discountId: discount.id,
        promoCodeId: null,
      };
    }

    if (dto.promoCode) {
      const promoCode = await manager.findOne(PromoCodeEntity, {
        where: { code: dto.promoCode, clinicId },
      });
      if (!promoCode) {
        throw new NotFoundException('Promo code not found');
      }
      if (
        !promoCode.isActive ||
        (promoCode.validFrom && promoCode.validFrom > now) ||
        (promoCode.validTo && promoCode.validTo < now)
      ) {
        throw new BadRequestException('Promo code is not active');
      }
      if (
        promoCode.maxUses !== null &&
        promoCode.usedCount >= promoCode.maxUses
      ) {
        throw new BadRequestException('Promo code usage limit reached');
      }

      await manager.increment(
        PromoCodeEntity,
        { id: promoCode.id },
        'usedCount',
        1,
      );

      return {
        discountAmount: this.applyDiscount(
          subtotal,
          promoCode.type,
          promoCode.value,
        ),
        discountId: null,
        promoCodeId: promoCode.id,
      };
    }

    return { discountAmount: '0.00', discountId: null, promoCodeId: null };
  }

  private applyDiscount(
    subtotal: string,
    type: DiscountType,
    value: string,
  ): string {
    const amount =
      type === DiscountType.PERCENT
        ? moneyPercent(subtotal, value)
        : toMoney(value);

    return Number(amount) > Number(subtotal) ? subtotal : amount;
  }

  private async generateNumber(
    manager: EntityManager,
    clinicId: string,
  ): Promise<string> {
    const count = await manager.count(InvoiceEntity, { where: { clinicId } });
    return `INV-${String(count + 1).padStart(INVOICE_NUMBER_PADDING, '0')}`;
  }
}
