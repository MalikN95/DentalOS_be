import { ApiProperty } from '@nestjs/swagger';

export class AvatarUploadResponseDto {
  @ApiProperty({ description: 'Presigned PUT URL for direct upload to S3' })
  uploadUrl: string;

  @ApiProperty({
    description: 'S3 object key to persist via PATCH /auth/me { avatarKey }',
    example: 'users/6f1d.../avatar',
  })
  key: string;
}
