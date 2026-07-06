import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ReviewStatus } from '../../../entities/review.entity';

const ALLOWED_STATUSES = [ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN] as const;

export class UpdateReviewStatusDto {
  @ApiProperty({ enum: ALLOWED_STATUSES })
  @IsIn(ALLOWED_STATUSES)
  status: ReviewStatus.PUBLISHED | ReviewStatus.HIDDEN;
}
