import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClinicEntity } from '../../entities/clinic.entity';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationListDto } from './dto/notification.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOkResponse({ type: NotificationListDto })
  list(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') userId: string,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<NotificationListDto> {
    return this.notificationsService.listForUser(
      clinic.id,
      userId,
      query.page,
      query.limit,
      query.unreadOnly,
    );
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAsRead(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.notificationsService.markAsRead(clinic.id, userId, id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllAsRead(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') userId: string,
  ): Promise<void> {
    return this.notificationsService.markAllAsRead(clinic.id, userId);
  }

  @Post('push-subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  registerPushToken(
    @CurrentUser('sub') userId: string,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<void> {
    return this.notificationsService.registerPushToken(userId, dto.token);
  }

  @Delete('push-subscriptions')
  @HttpCode(HttpStatus.NO_CONTENT)
  unregisterPushToken(
    @CurrentUser('sub') userId: string,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<void> {
    return this.notificationsService.unregisterPushToken(userId, dto.token);
  }
}
