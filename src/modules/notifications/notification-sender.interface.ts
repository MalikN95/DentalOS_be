import { NotificationChannel } from '../../common/enums/notification-channel.enum';

export interface NotificationMessage {
  // Phone number, email, chat id or device token depending on the channel
  to: string;
  subject?: string;
  body: string;
}

export interface NotificationSender {
  readonly channel: NotificationChannel;
  send(message: NotificationMessage): Promise<void>;
}

export const NOTIFICATION_SENDERS = Symbol('NOTIFICATION_SENDERS');
