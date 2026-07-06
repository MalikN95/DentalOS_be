import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { LeadEntity } from '../../entities/lead.entity';
import { PaymentEntity } from '../../entities/payment.entity';
import { RefundEntity } from '../../entities/refund.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEntity,
      RefundEntity,
      AppointmentEntity,
      LeadEntity,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
