import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMedicalRecordDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Required when the caller is not a doctor; ignored for doctors (their own profile is used)',
  })
  @IsOptional()
  @IsUUID()
  doctorProfileId?: string;

  @ApiPropertyOptional({
    example: 'Toothache in the lower left jaw for 3 days',
  })
  @IsOptional()
  @IsString()
  complaints?: string;

  @ApiPropertyOptional({
    example: 'Deep carious cavity on tooth 36, positive percussion',
  })
  @IsOptional()
  @IsString()
  examination?: string;

  @ApiProperty({ example: 'K02.1 Caries of dentine' })
  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @ApiPropertyOptional({ example: 'Composite filling on tooth 36' })
  @IsOptional()
  @IsString()
  treatment?: string;

  @ApiPropertyOptional({ example: 'Ibuprofen 400mg twice a day for 3 days' })
  @IsOptional()
  @IsString()
  prescriptions?: string;

  @ApiPropertyOptional({
    example: 'Avoid hard food for 24h, follow-up in 2 weeks',
  })
  @IsOptional()
  @IsString()
  recommendations?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
