import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PatientFileType } from '../../../entities/patient-file.entity';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListPatientFilesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PatientFileType })
  @IsOptional()
  @IsEnum(PatientFileType)
  type?: PatientFileType;
}
