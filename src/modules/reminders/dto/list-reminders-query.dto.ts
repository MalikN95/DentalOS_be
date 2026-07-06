import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { ReminderStatus } from '../../../entities/reminder.entity';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListRemindersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReminderStatus })
  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Filter by scheduledAt >= from',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Filter by scheduledAt <= to',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
