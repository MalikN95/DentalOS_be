import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { ReminderSettingEntity } from '../../entities/reminder-setting.entity';
import { ReminderEntity } from '../../entities/reminder.entity';
import { ListRemindersQueryDto } from './dto/list-reminders-query.dto';
import { ReminderSettingItemDto } from './dto/reminder-setting-item.dto';
import { RemindersService } from './reminders.service';
import { PaginatedResult } from './types/paginated-result.type';

@ApiTags('reminders')
@ApiBearerAuth()
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('settings')
  getSettings(
    @CurrentClinic() clinic: ClinicEntity,
  ): Promise<ReminderSettingEntity[]> {
    return this.remindersService.getSettings(clinic.id);
  }

  @Put('settings')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBody({ type: ReminderSettingItemDto, isArray: true })
  replaceSettings(
    @CurrentClinic() clinic: ClinicEntity,
    @Body(new ParseArrayPipe({ items: ReminderSettingItemDto }))
    items: ReminderSettingItemDto[],
  ): Promise<ReminderSettingEntity[]> {
    return this.remindersService.replaceSettings(clinic.id, items);
  }

  @Get()
  findAll(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListRemindersQueryDto,
  ): Promise<PaginatedResult<ReminderEntity>> {
    return this.remindersService.findAll(clinic.id, query);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReminderEntity> {
    return this.remindersService.cancel(clinic.id, id);
  }
}
