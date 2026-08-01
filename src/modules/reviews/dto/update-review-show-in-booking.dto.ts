import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateReviewShowInBookingDto {
  @ApiProperty()
  @IsBoolean()
  showInBooking: boolean;
}
