import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class MfaCodeDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @Matches(/^\d{6}$/u, { message: 'code must be a 6-digit number' })
  code: string;
}
