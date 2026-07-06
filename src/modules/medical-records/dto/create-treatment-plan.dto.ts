import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateTreatmentPlanItemDto } from './create-treatment-plan-item.dto';

export class CreateTreatmentPlanDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Required when the caller is not a doctor; ignored for doctors (their own profile is used)',
  })
  @IsOptional()
  @IsUUID()
  doctorProfileId?: string;

  @ApiProperty({ example: 'Full mouth rehabilitation' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateTreatmentPlanItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTreatmentPlanItemDto)
  items: CreateTreatmentPlanItemDto[];
}
