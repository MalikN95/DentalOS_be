import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import type { WorkingHours } from '../../../common/types/working-hours.type';

export class CreateBranchDto {
  @ApiProperty({ example: 'Main Branch' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '221B Baker Street' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ example: '41.3110550' })
  @IsOptional()
  @IsLatitude()
  latitude?: string;

  @ApiPropertyOptional({ example: '69.2796230' })
  @IsOptional()
  @IsLongitude()
  longitude?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description:
      'Weekly schedule override, e.g. { "mon": { "from": "09:00", "to": "18:00" }, ..., "sun": null }',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  workingHours?: WorkingHours;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
