import { Global, Module } from '@nestjs/common';
import { NOTIFICATION_SENDERS } from './notification-sender.interface';
import { NotificationsService } from './notifications.service';
import { createLogSenders } from './senders/log.sender';

@Global()
@Module({
  providers: [
    { provide: NOTIFICATION_SENDERS, useFactory: createLogSenders },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
