import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { ReferralStatus } from '../../../entities/referral.entity';

export class UpdateReferralDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  referredPatientId?: string | null;

  @ApiPropertyOptional({ enum: ReferralStatus })
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

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
