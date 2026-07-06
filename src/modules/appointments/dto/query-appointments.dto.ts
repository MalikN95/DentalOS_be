import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { AppointmentStatus } from '../../../common/enums/appointment-status.enum';

export class QueryAppointmentsDto {
  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  @IsISO8601()
  from: string;

  @ApiProperty({ example: '2026-07-31T23:59:59.999Z' })
  @IsISO8601()
  to: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  doctorProfileId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  patientId?: string;
}
