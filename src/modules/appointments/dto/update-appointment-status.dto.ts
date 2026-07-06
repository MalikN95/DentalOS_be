import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus } from '../../../common/enums/appointment-status.enum';

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatus })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @ApiPropertyOptional({
    example: 'Patient is sick',
    description: 'Required when status is cancelled',
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
