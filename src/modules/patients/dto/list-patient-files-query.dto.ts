import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { PatientFileType } from '../../../entities/patient-file.entity';
import { VALID_TOOTH_NUMBERS } from '../../dental-chart/constants/tooth-numbers.constant';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListPatientFilesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PatientFileType })
  @IsOptional()
  @IsEnum(PatientFileType)
  type?: PatientFileType;

  @ApiPropertyOptional({ example: 36, description: 'Filter by FDI tooth number' })
  @IsOptional()
  @Type(() => Number)
  @IsIn(VALID_TOOTH_NUMBERS, {
    message: 'toothNumber must be a valid FDI tooth number',
  })
  toothNumber?: number;
}
