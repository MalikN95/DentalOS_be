import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateTreatmentPlanItemDto } from './create-treatment-plan-item.dto';

export class ReplaceTreatmentPlanItemsDto {
  @ApiProperty({ type: [CreateTreatmentPlanItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTreatmentPlanItemDto)
  items: CreateTreatmentPlanItemDto[];
}
