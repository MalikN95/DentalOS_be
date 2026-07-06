import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeadStage } from '../../../entities/lead.entity';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListLeadsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LeadStage })
  @IsOptional()
  @IsEnum(LeadStage)
  stage?: LeadStage;

  @ApiPropertyOptional({
    description: 'Case-insensitive search by name, phone or email',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
