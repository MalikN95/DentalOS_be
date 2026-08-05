import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '../../../common/enums/notification-channel.enum';
import {
  NotificationMessage,
  NotificationSender,
} from '../notification-sender.interface';

const DEFAULT_API_VERSION = 'v21.0';

/**
 * Sends messages via the Meta WhatsApp Cloud API — plain text by default, or
 * an approved template when `message.whatsappTemplate` is set.
 *
 * Note: outbound free-form text only delivers within the 24h customer-service
 * window (i.e. the patient messaged the clinic's WhatsApp number recently).
 * Proactive messages outside that window (most appointment reminders) need
 * `whatsappTemplate` instead — see ReminderProcessorService for the caller
 * that picks a template by the reminder's offset.
 */
export class WhatsAppSender implements NotificationSender {
  readonly channel = NotificationChannel.WHATSAPP;

  private readonly logger = new Logger(WhatsAppSender.name);

  constructor(private readonly config: ConfigService) {}

  async send(message: NotificationMessage): Promise<void> {
    const accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      this.logger.warn(
        `WhatsApp is not configured (missing WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID) — skipping message to ${message.to}`,
      );
      return;
    }

    const apiVersion =
      this.config.get<string>('WHATSAPP_API_VERSION') ?? DEFAULT_API_VERSION;
    const to = message.to.replace(/[^\d]/g, '');
    const { whatsappTemplate } = message;

    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          whatsappTemplate
            ? {
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                  name: whatsappTemplate.name,
                  language: { code: whatsappTemplate.languageCode },
                  components: [
                    {
                      type: 'body',
                      parameters: whatsappTemplate.params.map((text) => ({
                        type: 'text',
                        text,
                      })),
                    },
                  ],
                },
              }
            : {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: message.body },
              },
        ),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `WhatsApp Cloud API send failed (${response.status}): ${errorBody}`,
      );
    }
  }
}
