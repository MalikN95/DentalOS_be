import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiProperty({ example: 'Dental implant placement' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: '1500.00',
    description: 'Decimal string, max 2 fraction digits',
  })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'price must be a decimal string like 1500 or 1500.00',
  })
  price: string;

  @ApiProperty({ example: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiPropertyOptional({ example: 'Two-stage implant placement' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 'Do not eat 2 hours before the visit' })
  @IsOptional()
  @IsString()
  preparation?: string | null;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Cabinet ids allowed for this service; empty = any cabinet',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allowedCabinetIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['x-ray', 'microscope'],
    description: 'Matched against EquipmentEntity.type; empty = none required',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredEquipmentTypes?: string[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    default: false,
    description:
      'Whether this service is offered through the public online-booking widget',
  })
  @IsOptional()
  @IsBoolean()
  acceptsOnlineBooking?: boolean;
}
