import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import {
  NOTIFICATION_SENDERS,
  NotificationMessage,
  NotificationSender,
} from './notification-sender.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  private readonly senders: Map<NotificationChannel, NotificationSender>;

  constructor(@Inject(NOTIFICATION_SENDERS) senders: NotificationSender[]) {
    this.senders = new Map(senders.map((sender) => [sender.channel, sender]));
  }

  async send(
    channel: NotificationChannel,
    message: NotificationMessage,
  ): Promise<void> {
    const sender = this.senders.get(channel);

    if (!sender) {
      this.logger.warn(`No sender registered for channel '${channel}'`);
      return;
    }

    await sender.send(message);
  }

  async sendToMany(
    channels: NotificationChannel[],
    message: NotificationMessage,
  ): Promise<void> {
    await Promise.all(channels.map((channel) => this.send(channel, message)));
  }
}
