import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateDoctorDto } from './create-doctor.dto';

export class UpdateDoctorDto extends PartialType(
  OmitType(CreateDoctorDto, ['userId'] as const),
) {
  @ApiPropertyOptional({
    description: 'S3 object key returned by photo-upload endpoint',
  })
  @IsOptional()
  @IsString()
  photoKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
