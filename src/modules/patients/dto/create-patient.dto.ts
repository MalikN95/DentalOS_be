import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PatientNotificationPreferencesDto } from '../../../common/dto/notification-preferences.dto';
import { Gender } from '../../../common/enums/gender.enum';
import { PatientInsurance } from '../../../entities/patient.entity';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class PatientInsuranceDto implements PatientInsurance {
  @ApiProperty({ example: 'AXA Insurance' })
  @IsString()
  @IsNotEmpty()
  company: string;

  @ApiProperty({ example: 'POL-123456' })
  @IsString()
  @IsNotEmpty()
  policyNumber: string;

  @ApiPropertyOptional({ example: '2027-12-31', nullable: true })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'validUntil must be YYYY-MM-DD' })
  validUntil: string | null = null;
}

export class CreatePatientDto {
  @ApiProperty({ example: 'Ivan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  firstName: string;

  @ApiProperty({ example: 'Petrov' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  lastName: string;

  @ApiProperty({ example: '+79001234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone: string;

  @ApiPropertyOptional({ example: '1990-05-14' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'birthDate must be YYYY-MM-DD' })
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 'patient@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ type: PatientInsuranceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PatientInsuranceDto)
  insurance?: PatientInsuranceDto;

  @ApiPropertyOptional({ type: [String], example: ['penicillin'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ type: [String], example: ['diabetes'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicDiseases?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({ type: PatientNotificationPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PatientNotificationPreferencesDto)
  notificationPreferences?: PatientNotificationPreferencesDto;
}
