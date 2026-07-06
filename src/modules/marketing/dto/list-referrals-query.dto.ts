import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ReferralStatus } from '../../../entities/referral.entity';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListReferralsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReferralStatus })
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;
}
