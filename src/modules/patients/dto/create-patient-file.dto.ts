import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PatientFileType } from '../../../entities/patient-file.entity';
import { VALID_TOOTH_NUMBERS } from '../../dental-chart/constants/tooth-numbers.constant';

export class CreatePatientFileDto {
  @ApiProperty({
    description: 'S3 object key returned by the upload endpoint',
    example: 'patients/{clinicId}/{patientId}/{uuid}-panoramic-xray.jpg',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'panoramic-xray.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  mimeType: string;

  @ApiProperty({ example: 245760 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeBytes: number;

  @ApiProperty({ enum: PatientFileType })
  @IsEnum(PatientFileType)
  type: PatientFileType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  medicalRecordId?: string;

  @ApiPropertyOptional({
    example: 36,
    description: 'FDI tooth number (11-18, 21-28, 31-38, 41-48)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn(VALID_TOOTH_NUMBERS, {
    message: 'toothNumber must be a valid FDI tooth number',
  })
  toothNumber?: number;
}
