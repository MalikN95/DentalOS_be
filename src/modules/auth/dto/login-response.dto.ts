import { ApiProperty } from '@nestjs/swagger';

// Union response: tokens for regular logins, MFA challenge when mfaEnabled
export class LoginResponseDto {
  @ApiProperty({ required: false })
  accessToken?: string;

  @ApiProperty({ required: false })
  refreshToken?: string;

  @ApiProperty({ required: false, example: true })
  mfaRequired?: boolean;

  @ApiProperty({
    required: false,
    description: 'Short-lived token for POST /auth/mfa/verify',
  })
  mfaToken?: string;
}
