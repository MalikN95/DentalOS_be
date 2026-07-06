import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class SmsRequestDto {
  @ApiProperty({ example: '+79991234567' })
  @Matches(/^\+?\d{10,15}$/u, { message: 'phone must be a valid number' })
  phone: string;
}
