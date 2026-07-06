import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { ToothCondition } from '../../../entities/tooth-mark.entity';
import { VALID_TOOTH_NUMBERS } from '../constants/tooth-numbers.constant';

export class CreateToothMarkDto {
  @ApiProperty({
    example: 36,
    description: 'FDI tooth number (11-18, 21-28, 31-38, 41-48)',
  })
  @IsIn(VALID_TOOTH_NUMBERS, {
    message: 'toothNumber must be a valid FDI tooth number',
  })
  toothNumber: number;

  @ApiProperty({ enum: ToothCondition })
  @IsEnum(ToothCondition)
  condition: ToothCondition;

  @ApiPropertyOptional({ example: 'Deep caries on distal surface' })
  @IsOptional()
  @IsString()
  comment?: string;
}
