import { NotificationChannel } from '../../common/enums/notification-channel.enum';

export interface NotificationMessage {
  // Phone number, email, chat id, device token, or (for the in-app channel) a user id
  to: string;
  subject?: string;
  body: string;
  // Required by the in-app sender (to satisfy NotificationEntity.clinicId); ignored by every other channel.
  clinicId?: string;
  // Used by the email sender as the "From" display name; ignored by every other channel.
  clinicName?: string;
}

export interface NotificationSender {
  readonly channel: NotificationChannel;
  send(message: NotificationMessage): Promise<void>;
}

export const NOTIFICATION_SENDERS = Symbol('NOTIFICATION_SENDERS');
