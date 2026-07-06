import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class PhotoUploadDto {
  @ApiProperty({ example: 'image/jpeg' })
  @Matches(/^image\/[\w.+-]+$/, {
    message: 'contentType must be a valid image MIME type',
  })
  contentType: string;
}

export class PhotoUploadResponseDto {
  @ApiProperty({ description: 'Presigned PUT URL' })
  uploadUrl: string;

  @ApiProperty({ description: 'S3 object key to save via PATCH photoKey' })
  key: string;
}
