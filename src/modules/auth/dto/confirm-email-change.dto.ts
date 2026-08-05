import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches } from 'class-validator';

export class ConfirmEmailChangeDto {
  @ApiProperty({ example: 'new.email@clinic.com' })
  @IsEmail()
  newEmail: string;

  @ApiProperty({ example: '1234' })
  @Matches(/^\d{4}$/, { message: 'code must be a 4-digit number' })
  code: string;
}
