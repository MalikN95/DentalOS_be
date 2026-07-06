import { DiscountType } from '../../../entities/discount.entity';

export interface PromoCodeValidationResult {
  valid: boolean;
  type?: DiscountType;
  value?: string;
  reason?: string;
}
