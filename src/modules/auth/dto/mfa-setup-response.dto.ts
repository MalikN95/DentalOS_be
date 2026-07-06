import { ApiProperty } from '@nestjs/swagger';

export class MfaSetupResponseDto {
  @ApiProperty({ description: 'Base32 TOTP secret (RFC 6238)' })
  secret: string;

  @ApiProperty({ description: 'otpauth:// URL for authenticator apps' })
  otpauthUrl: string;
}
