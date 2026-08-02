import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  PatientNotificationPreferences,
  StaffNotificationPreferences,
} from '../types/notification-preferences.type';

// `push` is deliberately optional here: it can only be granted from the
// patient's own browser (booking widget), never set on their behalf from the
// staff-facing patient form — omitting it leaves whatever value they already have.
export class PatientNotificationPreferencesDto implements Partial<PatientNotificationPreferences> {
  @ApiProperty()
  @IsBoolean()
  email: boolean;

  @ApiProperty()
  @IsBoolean()
  whatsapp: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  push?: boolean;
}

export class StaffNotificationPreferencesDto implements StaffNotificationPreferences {
  @ApiProperty()
  @IsBoolean()
  email: boolean;

  @ApiProperty()
  @IsBoolean()
  whatsapp: boolean;

  @ApiProperty()
  @IsBoolean()
  push: boolean;

  @ApiProperty()
  @IsBoolean()
  inApp: boolean;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  reviewAlertMaxRating: number;
}
