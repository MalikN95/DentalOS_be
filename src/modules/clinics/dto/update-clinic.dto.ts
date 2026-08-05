import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import type { WorkingHours } from '../../../common/types/working-hours.type';

export class UpdateClinicDto {
  @ApiPropertyOptional({ example: 'Bright Smile Dental' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: '221B Baker Street' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@clinic.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description:
      'Weekly schedule, e.g. { "mon": { "from": "09:00", "to": "18:00" }, ..., "sun": null }',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  workingHours?: WorkingHours;

  @ApiPropertyOptional({ example: 'Asia/Tashkent' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  language?: string;

  @ApiPropertyOptional({
    description: 'S3 object key returned by POST /clinic/logo-upload',
    example: 'clinics/6f1d.../logo',
  })
  @IsOptional()
  @IsString()
  logoKey?: string;

  @ApiPropertyOptional({
    description: 'Whether the clinic is active (accepting bookings, visible to staff)',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
