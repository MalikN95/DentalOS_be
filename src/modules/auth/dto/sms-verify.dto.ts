import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class SmsVerifyDto {
  @ApiProperty({ example: '+79991234567' })
  @Matches(/^\+?\d{10,15}$/u, { message: 'phone must be a valid number' })
  phone: string;

  @ApiProperty({ example: '123456', description: '6-digit SMS code' })
  @Matches(/^\d{6}$/u, { message: 'code must be a 6-digit number' })
  code: string;
}
