import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListTreatmentPlansQueryDto extends PaginationQueryDto {
  // Omit to list plans across the whole clinic
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Created on/after this ISO date' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'Created on/before this ISO date' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
