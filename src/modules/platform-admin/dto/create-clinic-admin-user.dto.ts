import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** bcrypt silently truncates anything past 72 bytes. */
const PASSWORD_MAX_LENGTH = 72;

export class CreateClinicAdminUserDto {
  @ApiProperty({ example: 'Иван' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  firstName: string;

  @ApiProperty({ example: 'Иванов' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  lastName: string;

  @ApiProperty({ example: 'owner@clinic.com' })
  @IsEmail()
  @MaxLength(160)
  email: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiProperty({ minLength: 8, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(8)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
