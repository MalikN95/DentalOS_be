import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class AvatarUploadDto {
  @ApiProperty({ example: 'image/png' })
  @IsString()
  @Matches(/^image\//, { message: 'contentType must be an image MIME type' })
  contentType: string;
}
