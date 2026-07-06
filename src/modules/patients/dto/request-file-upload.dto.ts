import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PatientFileType } from '../../../entities/patient-file.entity';

export class RequestFileUploadDto {
  @ApiProperty({ example: 'panoramic-xray.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contentType: string;

  @ApiProperty({ enum: PatientFileType })
  @IsEnum(PatientFileType)
  type: PatientFileType;
}

export class FileUploadTargetDto {
  @ApiProperty({ description: 'Presigned PUT URL' })
  uploadUrl: string;

  @ApiProperty({
    example: 'patients/{clinicId}/{patientId}/{uuid}-panoramic-xray.jpg',
  })
  key: string;
}
