import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Matches, Min } from 'class-validator';
import { VALID_TOOTH_NUMBERS } from '../../dental-chart/constants/tooth-numbers.constant';

export class CreateTreatmentPlanItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiPropertyOptional({
    example: 36,
    description: 'FDI tooth number (11-18, 21-28, 31-38, 41-48)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn(VALID_TOOTH_NUMBERS)
  toothNumber?: number;

  @ApiPropertyOptional({
    example: '1500.00',
    description: 'Defaults to the current service price',
  })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'price must be a decimal string like 1500.00',
  })
  price?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
