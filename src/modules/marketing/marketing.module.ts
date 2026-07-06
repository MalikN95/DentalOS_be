import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscountEntity } from '../../entities/discount.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { PromoCodeEntity } from '../../entities/promo-code.entity';
import { PromotionEntity } from '../../entities/promotion.entity';
import { ReferralEntity } from '../../entities/referral.entity';
import { PromoCodesController } from './promo-codes.controller';
import { PromoCodesService } from './promo-codes.service';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromotionEntity,
      PromoCodeEntity,
      ReferralEntity,
      DiscountEntity,
      PatientEntity,
    ]),
  ],
  controllers: [
    PromotionsController,
    PromoCodesController,
    ReferralsController,
  ],
  providers: [PromotionsService, PromoCodesService, ReferralsService],
  exports: [PromotionsService, PromoCodesService, ReferralsService],
})
export class MarketingModule {}
