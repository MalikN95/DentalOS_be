import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ScheduleExceptionType } from '../../../entities/schedule-exception.entity';

export class CreateScheduleExceptionDto {
  @ApiProperty({ enum: ScheduleExceptionType })
  @IsEnum(ScheduleExceptionType)
  type: ScheduleExceptionType;

  @ApiProperty({ example: '2026-07-10', description: 'Inclusive start date' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ example: '2026-07-24', description: 'Inclusive end date' })
  @IsDateString()
  dateTo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
