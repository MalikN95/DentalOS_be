import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateReferralDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  referrerPatientId: string;

  @ApiPropertyOptional({
    example: '500.00',
    description: 'Decimal string, max 2 fraction digits',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'rewardAmount must be a decimal string like 500 or 500.00',
  })
  rewardAmount?: string | null;
}
