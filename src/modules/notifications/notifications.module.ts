import { Global, Module } from '@nestjs/common';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import { MailModule } from '../mail/mail.module';
import { MailService } from '../mail/mail.service';
import {
  NOTIFICATION_SENDERS,
  NotificationSender,
} from './notification-sender.interface';
import { NotificationsService } from './notifications.service';
import { LogSender } from './senders/log.sender';
import { MailSender } from './senders/mail.sender';

const createSenders = (mailService: MailService): NotificationSender[] =>
  Object.values(NotificationChannel).map((channel) =>
    channel === NotificationChannel.EMAIL
      ? new MailSender(mailService)
      : new LogSender(channel),
  );

@Global()
@Module({
  imports: [MailModule],
  providers: [
    {
      provide: NOTIFICATION_SENDERS,
      useFactory: createSenders,
      inject: [MailService],
    },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
