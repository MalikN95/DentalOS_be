import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class SmsVerifyDto {
  @ApiProperty({ example: '+79991234567' })
  @Matches(/^\+?\d{10,15}$/u, { message: 'phone must be a valid number' })
  phone: string;

  @ApiProperty({ example: '1234', description: '4-digit SMS code' })
  @Matches(/^\d{4}$/u, { message: 'code must be a 4-digit number' })
  code: string;
}
