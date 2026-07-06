import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  doctorProfileId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cabinetId?: string;

  @ApiProperty({ example: '2026-07-10T09:00:00.000Z' })
  @IsISO8601()
  startsAt: string;

  @ApiPropertyOptional({ example: 'Patient asked for anesthesia' })
  @IsOptional()
  @IsString()
  comment?: string;
}
