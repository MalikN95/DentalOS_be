import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { DiscountType } from '../../../entities/discount.entity';

export class CreatePromoCodeDto {
  @ApiPropertyOptional({
    example: 'SUMMER20',
    description: 'Generated automatically when omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'code must contain only A-Z, 0-9 and dashes',
  })
  code?: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENT })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({
    example: '20.00',
    description: 'Percent (0-100) or fixed amount depending on type',
  })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'value must be a decimal string like 20 or 20.00',
  })
  value: string;

  @ApiPropertyOptional({ example: 100, description: 'null = unlimited' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @ApiPropertyOptional({ example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  validTo?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
