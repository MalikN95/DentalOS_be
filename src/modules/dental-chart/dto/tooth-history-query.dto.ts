import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { VALID_TOOTH_NUMBERS } from '../constants/tooth-numbers.constant';
import { PaginationQueryDto } from './pagination-query.dto';

export class ToothHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 36,
    description: 'Filter history by FDI tooth number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn(VALID_TOOTH_NUMBERS, {
    message: 'toothNumber must be a valid FDI tooth number',
  })
  toothNumber?: number;
}
