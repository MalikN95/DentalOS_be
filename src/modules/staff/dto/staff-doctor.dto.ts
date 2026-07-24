import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

/** Doctor-profile part of a staff member; only meaningful for the DOCTOR role. */
export class StaffDoctorDto {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Primary branch; null detaches the doctor from any branch',
  })
  @IsOptional()
  @ValidateIf((dto: StaffDoctorDto) => dto.branchId !== null)
  @IsUUID()
  branchId?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['Терапевт'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional({ type: [String], example: ['РНИМУ им. Пирогова'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  education?: string[];

  @ApiPropertyOptional({ minimum: 0, maximum: 80 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  experienceYears?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((dto: StaffDoctorDto) => dto.description !== null)
  @IsString()
  description?: string | null;
}
