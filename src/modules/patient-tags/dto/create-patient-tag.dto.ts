import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePatientTagDto {
  @ApiProperty({ example: 'VIP' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string;

  @ApiPropertyOptional({
    example: 210,
    description: 'Hue in degrees (0-359); omit to auto-generate from the tag id',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(359)
  color?: number;
}
