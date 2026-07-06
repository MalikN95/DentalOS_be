import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { NotificationChannel } from '../../../common/enums/notification-channel.enum';

export class ReminderSettingItemDto {
  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({
    description:
      'Minutes before the appointment (60 = hour, 1440 = day, 10080 = week)',
    example: 1440,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  offsetMinutes: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  isEnabled: boolean;
}
