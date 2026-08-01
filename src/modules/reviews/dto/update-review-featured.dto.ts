import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateReviewFeaturedDto {
  @ApiProperty()
  @IsBoolean()
  featured: boolean;
}
