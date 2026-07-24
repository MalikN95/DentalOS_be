import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { STAFF_ROLES } from '../staff.types';
import { StaffDoctorDto } from './staff-doctor.dto';

/** bcrypt silently truncates anything past 72 bytes. */
const PASSWORD_MAX_LENGTH = 72;

export class CreateStaffDto {
  @ApiProperty({ example: 'ivanov@maximum.local' })
  @IsEmail()
  @MaxLength(160)
  email: string;

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

  @ApiPropertyOptional({ example: '+79001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn([...STAFF_ROLES])
  role: UserRole;

  @ApiProperty({ minLength: 8, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(8)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: StaffDoctorDto,
    description: 'Ignored unless role is DOCTOR',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffDoctorDto)
  doctor?: StaffDoctorDto;
}
