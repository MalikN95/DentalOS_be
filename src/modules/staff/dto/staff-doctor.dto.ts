import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
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

  @ApiPropertyOptional({
    description:
      'Whether this doctor is offered through the public online-booking widget',
  })
  @IsOptional()
  @IsBoolean()
  acceptsOnlineBooking?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    minimum: 0,
    maximum: 365,
    description:
      'How many days ahead a patient can self-book this doctor through the public widget; null/omitted = no limit. Only affects the public widget, not staff-created appointments.',
  })
  @IsOptional()
  @ValidateIf((dto: StaffDoctorDto) => dto.maxAdvanceBookingDays !== null)
  @IsInt()
  @Min(0)
  @Max(365)
  maxAdvanceBookingDays?: number | null;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description:
      'Services this doctor provides; drives online-booking doctor filtering',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  serviceIds?: string[];
}
