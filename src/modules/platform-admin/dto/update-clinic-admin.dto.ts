import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateClinicAdminDto {
  @ApiPropertyOptional({ example: 'Bright Smile Dental' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'bright-smile' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug may only contain lowercase letters, numbers and hyphens',
  })
  slug?: string;

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

  @ApiPropertyOptional({
    description: 'Block (false) or unblock (true) the clinic platform-wide',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
