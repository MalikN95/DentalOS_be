import { NotificationChannel } from '../../common/enums/notification-channel.enum';

// A pre-approved Meta message template — required for WhatsApp sends outside
// the 24h customer-service window (e.g. proactive appointment reminders,
// where the free-form `text` API call Meta otherwise rejects).
export interface WhatsAppTemplatePayload {
  // Exact template name as registered in Meta (Business Manager > Account
  // tools > Message templates).
  name: string;
  // Must match the language the template was submitted/approved under in
  // Meta, NOT the language of the template's text — Meta rejects the send
  // otherwise. Verify the real code on the template's detail page.
  languageCode: string;
  // Positional values for the template body's {{1}}, {{2}}, ... placeholders.
  params: string[];
}

export interface NotificationMessage {
  // Phone number, email, chat id, device token, or (for the in-app channel) a user id
  to: string;
  subject?: string;
  body: string;
  // Required by the in-app sender (to satisfy NotificationEntity.clinicId); ignored by every other channel.
  clinicId?: string;
  // Used by the email sender as the "From" display name; ignored by every other channel.
  clinicName?: string;
  // WhatsApp only — when set, WhatsAppSender sends this template instead of
  // free-form `body`; ignored by every other channel.
  whatsappTemplate?: WhatsAppTemplatePayload;
}

export interface NotificationSender {
  readonly channel: NotificationChannel;
  send(message: NotificationMessage): Promise<void>;
}

export const NOTIFICATION_SENDERS = Symbol('NOTIFICATION_SENDERS');
