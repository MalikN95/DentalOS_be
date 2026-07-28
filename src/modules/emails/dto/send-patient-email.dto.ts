import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export enum SendEmailMode {
  CUSTOM = 'custom',
  TEMPLATE = 'template',
}

export class SendPatientEmailDto {
  @ApiProperty({ enum: SendEmailMode })
  @IsEnum(SendEmailMode)
  mode: SendEmailMode;

  @ApiPropertyOptional({ description: 'Required when mode = template' })
  @ValidateIf((dto: SendPatientEmailDto) => dto.mode === SendEmailMode.TEMPLATE)
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Required when mode = custom' })
  @ValidateIf((dto: SendPatientEmailDto) => dto.mode === SendEmailMode.CUSTOM)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ description: 'Required when mode = custom' })
  @ValidateIf((dto: SendPatientEmailDto) => dto.mode === SendEmailMode.CUSTOM)
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  body?: string;
}
