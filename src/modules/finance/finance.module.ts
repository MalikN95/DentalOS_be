import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { DiscountEntity } from '../../entities/discount.entity';
import { GiftCertificateEntity } from '../../entities/gift-certificate.entity';
import { InvoiceItemEntity } from '../../entities/invoice-item.entity';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { PaymentEntity } from '../../entities/payment.entity';
import { PromoCodeEntity } from '../../entities/promo-code.entity';
import { RefundEntity } from '../../entities/refund.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';
import { GiftCertificatesController } from './gift-certificates.controller';
import { GiftCertificatesService } from './gift-certificates.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvoiceEntity,
      InvoiceItemEntity,
      PaymentEntity,
      RefundEntity,
      DiscountEntity,
      GiftCertificateEntity,
      PromoCodeEntity,
      PatientEntity,
      ServiceEntity,
      AppointmentEntity,
    ]),
  ],
  controllers: [
    InvoicesController,
    PaymentsController,
    DiscountsController,
    GiftCertificatesController,
  ],
  providers: [
    InvoicesService,
    PaymentsService,
    DiscountsService,
    GiftCertificatesService,
  ],
  exports: [InvoicesService, PaymentsService],
})
export class FinanceModule {}
