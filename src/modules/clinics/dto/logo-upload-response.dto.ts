import { ApiProperty } from '@nestjs/swagger';

export class LogoUploadResponseDto {
  @ApiProperty({ description: 'Presigned PUT URL for direct upload to S3' })
  uploadUrl: string;

  @ApiProperty({
    description: 'S3 object key to persist via PATCH /clinic { logoKey }',
    example: 'clinics/6f1d.../logo',
  })
  key: string;
}
