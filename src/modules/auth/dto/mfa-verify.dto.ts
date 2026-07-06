import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, Matches } from 'class-validator';

export class MfaVerifyDto {
  @ApiProperty({ description: 'mfaToken received from POST /auth/login' })
  @IsJWT()
  mfaToken: string;

  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @Matches(/^\d{6}$/u, { message: 'code must be a 6-digit number' })
  code: string;
}
