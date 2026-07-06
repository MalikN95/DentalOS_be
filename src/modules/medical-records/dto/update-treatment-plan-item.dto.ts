import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TreatmentPlanItemStatus } from '../../../entities/treatment-plan-item.entity';

export class UpdateTreatmentPlanItemDto {
  @ApiProperty({ enum: TreatmentPlanItemStatus })
  @IsEnum(TreatmentPlanItemStatus)
  status: TreatmentPlanItemStatus;
}
