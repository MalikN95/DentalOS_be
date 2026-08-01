import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { NotificationChannel } from '../../../common/enums/notification-channel.enum';
import {
  NotificationMessage,
  NotificationSender,
} from '../notification-sender.interface';

const FIREBASE_APP_NAME = 'dentalos-fcm';

/** Sends web-push notifications via Firebase Cloud Messaging. `message.to` is an FCM device token. */
export class FcmSender implements NotificationSender {
  readonly channel = NotificationChannel.PUSH;

  private readonly logger = new Logger(FcmSender.name);

  private readonly app: admin.app.App | null;

  constructor(config: ConfigService) {
    const projectId = config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.app = null;
      return;
    }

    const existing = admin.apps.find((app) => app?.name === FIREBASE_APP_NAME);
    this.app =
      existing ??
      admin.initializeApp(
        {
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        },
        FIREBASE_APP_NAME,
      );
  }

  async send(message: NotificationMessage): Promise<void> {
    if (!this.app) {
      this.logger.warn(
        `Firebase is not configured (missing FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY) — skipping push to ${message.to}`,
      );
      return;
    }

    await admin.messaging(this.app).send({
      token: message.to,
      notification: {
        title: message.subject ?? 'DentalOS',
        body: message.body,
      },
    });
  }
}
