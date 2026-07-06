import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { EquipmentStatus } from '../../../entities/equipment.entity';

export class CreateEquipmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Assign to a specific cabinet within the branch',
  })
  @IsOptional()
  @IsUUID()
  cabinetId?: string;

  @ApiProperty({ example: 'Panoramic X-ray' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'xray' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'SN-2024-00123' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({
    enum: EquipmentStatus,
    default: EquipmentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  purchasedAt?: string;

  @ApiPropertyOptional({ example: 'Annual maintenance every January' })
  @IsOptional()
  @IsString()
  notes?: string;
}
