import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

// Same slot-selection shape as CreateBookingDto, minus the contact-info
// fields — the patient is already known (resolved from the JWT), not
// collected from the form.
export class BookForPatientDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  doctorProfileId: string;

  @ApiProperty({
    example: '2026-07-15',
    description: 'Date in YYYY-MM-DD format',
  })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date: string;

  @ApiProperty({ example: '14:30', description: 'Time in HH:mm format' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'time must be in HH:mm format',
  })
  time: string;

  @ApiPropertyOptional({ example: 'Tooth pain on the left side' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
