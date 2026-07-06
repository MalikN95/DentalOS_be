import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ example: 'Follow-up after implant placement' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Recomputes endsAt and price snapshot',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  patientId?: string;
}
