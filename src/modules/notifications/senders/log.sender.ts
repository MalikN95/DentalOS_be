import { Logger } from '@nestjs/common';
import { NotificationChannel } from '../../../common/enums/notification-channel.enum';
import {
  NotificationMessage,
  NotificationSender,
} from '../notification-sender.interface';

/**
 * Placeholder transport: logs instead of sending.
 * Replace with a real provider (Twilio, SMTP, FCM, Bot API, ...) per channel
 * by implementing NotificationSender and registering it in NotificationsModule.
 */
export class LogSender implements NotificationSender {
  private readonly logger = new Logger(LogSender.name);

  constructor(readonly channel: NotificationChannel) {}

  send(message: NotificationMessage): Promise<void> {
    this.logger.log(
      `[${this.channel}] to=${message.to} subject=${message.subject ?? '-'} body=${message.body}`,
    );

    return Promise.resolve();
  }
}

export const createLogSenders = (): NotificationSender[] =>
  Object.values(NotificationChannel).map((channel) => new LogSender(channel));
