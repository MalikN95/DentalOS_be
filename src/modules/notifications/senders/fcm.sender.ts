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
    const rawPrivateKey = config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !rawPrivateKey) {
      this.app = null;
      return;
    }

    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

    // One-time, boot-time diagnostic — never logs the key body itself, only
    // shape/length, so a truncated/mangled paste into .env is visible in
    // `pm2 logs` without having to SSH in and inspect the raw file.
    this.logger.log(
      `Firebase config loaded — project: ${projectId}, clientEmail: ${clientEmail}, ` +
        `privateKey length: ${privateKey.length}, starts: ${JSON.stringify(privateKey.slice(0, 27))}, ` +
        `ends: ${JSON.stringify(privateKey.slice(-25))}`,
    );

    const existing = admin.apps.find((app) => app?.name === FIREBASE_APP_NAME);
    this.app =
      existing ??
      admin.initializeApp(
        {
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        },
        FIREBASE_APP_NAME,
      );

    // Boot-time self-test: fetch a Google OAuth access token right away so a
    // bad/revoked/mistyped credential shows up in the logs at startup,
    // instead of only surfacing the first time a real push is sent.
    this.app.options.credential
      ?.getAccessToken()
      .then(() =>
        this.logger.log(
          'Firebase Admin credential OK — access token fetched successfully at boot',
        ),
      )
      .catch((error: unknown) => {
        this.logger.error(
          'Firebase Admin credential self-test FAILED at boot',
          error instanceof Error ? error.stack : String(error),
        );
      });
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
