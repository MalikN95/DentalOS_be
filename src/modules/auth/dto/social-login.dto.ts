import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class SocialLoginDto {
  @ApiProperty({ description: 'RS256 ID token issued by Google or Apple' })
  @IsJWT()
  idToken: string;
}
