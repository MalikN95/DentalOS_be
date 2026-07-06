import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Matches, Max, Min } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ScheduleSlotDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId: string;

  @ApiProperty({
    minimum: 0,
    maximum: 6,
    description: '0 = Monday ... 6 = Sunday',
  })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @ApiProperty({ example: '09:00', description: 'HH:mm, clinic-local time' })
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @ApiProperty({ example: '18:00', description: 'HH:mm, clinic-local time' })
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm format' })
  endTime: string;
}
