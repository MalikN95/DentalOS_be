import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class MagicLinkVerifyDto {
  @ApiProperty({ description: 'Token from the WhatsApp login link' })
  @IsString()
  @Length(1, 512)
  token: string;
}
