import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { PatientPortalAppointmentScope } from '../types/patient-portal.types';

const SCOPES: PatientPortalAppointmentScope[] = ['upcoming', 'past'];

export class ListPatientAppointmentsQueryDto {
  @ApiPropertyOptional({ enum: SCOPES, default: 'upcoming' })
  @IsOptional()
  @IsIn(SCOPES)
  scope: PatientPortalAppointmentScope = 'upcoming';
}
