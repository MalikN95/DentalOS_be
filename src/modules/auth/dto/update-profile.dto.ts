import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Email is deliberately NOT here — changing it always goes through
// POST /auth/me/email-change/request + /confirm (OTP-verified), never a
// blind PATCH, so ownership of the new address is always proven first.
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'S3 object key returned by POST /auth/me/avatar-upload',
    example: 'users/6f1d.../avatar',
  })
  @IsOptional()
  @IsString()
  avatarKey?: string;
}
