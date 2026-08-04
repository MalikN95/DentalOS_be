import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { CreateClinicAdminUserDto } from './create-clinic-admin-user.dto';

export class CreateClinicAdminDto {
  @ApiProperty({ example: 'Bright Smile Dental' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'bright-smile',
    description: 'Used in the booking widget URL and login resolution',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug may only contain lowercase letters, numbers and hyphens',
  })
  slug: string;

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

  @ApiProperty({
    type: CreateClinicAdminUserDto,
    description: "The clinic's first user (created with the OWNER role)",
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateClinicAdminUserDto)
  admin: CreateClinicAdminUserDto;
}
