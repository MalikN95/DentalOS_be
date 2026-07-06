import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  GiftCertificateEntity,
  GiftCertificateStatus,
} from '../../entities/gift-certificate.entity';
import { InvoiceEntity, InvoiceStatus } from '../../entities/invoice.entity';
import { PaymentEntity, PaymentMethod } from '../../entities/payment.entity';
import { RefundEntity } from '../../entities/refund.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { moneyAdd, moneySub, toMoney } from './money';

export interface PaginatedPayments {
  items: PaymentEntity[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  create(
    clinicId: string,
    userId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentEntity> {
    return this.dataSource.transaction(async (manager) => {
      const invoice = await manager.findOne(InvoiceEntity, {
        where: { id: dto.invoiceId, clinicId },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }
      if (
        invoice.status !== InvoiceStatus.PENDING &&
        invoice.status !== InvoiceStatus.PARTIALLY_PAID
      ) {
        throw new BadRequestException('Invoice is not payable');
      }

      const amount = toMoney(dto.amount);
      let giftCertificateId: string | null = null;

      if (dto.method === PaymentMethod.GIFT_CERTIFICATE) {
        giftCertificateId = await this.chargeGiftCertificate(
          manager.getRepository(GiftCertificateEntity),
          clinicId,
          dto.giftCertificateId,
          amount,
        );
      }

      const payment = await manager.save(
        manager.create(PaymentEntity, {
          invoiceId: invoice.id,
          method: dto.method,
          amount,
          giftCertificateId,
          receiptNumber: dto.receiptNumber ?? null,
          receivedById: userId,
        }),
      );

      const payments = await manager.find(PaymentEntity, {
        where: { invoiceId: invoice.id },
      });
      const totalPaid = payments.reduce(
        (sum, item) => moneyAdd(sum, item.amount),
        '0.00',
      );

      invoice.status =
        Number(totalPaid) >= Number(invoice.total)
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID;
      await manager.save(invoice);

      return payment;
    });
  }

  async list(
    clinicId: string,
    query: ListPaymentsQueryDto,
  ): Promise<PaginatedPayments> {
    const { page, limit, invoiceId } = query;

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.invoice', 'invoice', 'invoice.clinicId = :clinicId', {
        clinicId,
      })
      .orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (invoiceId) {
      qb.andWhere('payment.invoiceId = :invoiceId', { invoiceId });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  refund(
    clinicId: string,
    userId: string,
    paymentId: string,
    dto: RefundPaymentDto,
  ): Promise<RefundEntity> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(PaymentEntity, {
        where: { id: paymentId },
        relations: { invoice: true },
      });
      if (!payment || payment.invoice.clinicId !== clinicId) {
        throw new NotFoundException('Payment not found');
      }

      const amount = toMoney(dto.amount);
      const paymentRefunds = await manager.find(RefundEntity, {
        where: { paymentId },
      });
      const alreadyRefunded = paymentRefunds.reduce(
        (sum, item) => moneyAdd(sum, item.amount),
        '0.00',
      );
      const available = moneySub(payment.amount, alreadyRefunded);

      if (Number(amount) > Number(available)) {
        throw new BadRequestException(
          `Refund amount exceeds refundable balance (${available})`,
        );
      }

      const refund = await manager.save(
        manager.create(RefundEntity, {
          paymentId,
          amount,
          reason: dto.reason,
          processedById: userId,
        }),
      );

      const invoicePayments = await manager.find(PaymentEntity, {
        where: { invoiceId: payment.invoiceId },
      });
      const totalPaid = invoicePayments.reduce(
        (sum, item) => moneyAdd(sum, item.amount),
        '0.00',
      );
      const invoiceRefunds = await manager.find(RefundEntity, {
        where: { paymentId: In(invoicePayments.map((item) => item.id)) },
      });
      const totalRefunded = invoiceRefunds.reduce(
        (sum, item) => moneyAdd(sum, item.amount),
        '0.00',
      );

      if (Number(totalPaid) > 0 && totalRefunded === totalPaid) {
        await manager.update(
          InvoiceEntity,
          { id: payment.invoiceId },
          { status: InvoiceStatus.REFUNDED },
        );
      }

      return refund;
    });
  }

  private async chargeGiftCertificate(
    repository: Repository<GiftCertificateEntity>,
    clinicId: string,
    giftCertificateId: string | undefined,
    amount: string,
  ): Promise<string> {
    if (!giftCertificateId) {
      throw new BadRequestException(
        'giftCertificateId is required for gift certificate payments',
      );
    }

    const certificate = await repository.findOne({
      where: { id: giftCertificateId, clinicId },
    });
    if (!certificate) {
      throw new NotFoundException('Gift certificate not found');
    }
    if (certificate.status !== GiftCertificateStatus.ACTIVE) {
      throw new BadRequestException('Gift certificate is not active');
    }
    if (certificate.expiresAt && certificate.expiresAt < new Date()) {
      throw new BadRequestException('Gift certificate has expired');
    }
    if (Number(certificate.balance) < Number(amount)) {
      throw new BadRequestException('Insufficient gift certificate balance');
    }

    certificate.balance = moneySub(certificate.balance, amount);
    if (Number(certificate.balance) === 0) {
      certificate.status = GiftCertificateStatus.USED;
    }
    await repository.save(certificate);

    return certificate.id;
  }
}
