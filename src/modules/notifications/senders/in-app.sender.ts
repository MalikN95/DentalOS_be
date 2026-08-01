import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NotificationChannel } from '../../../common/enums/notification-channel.enum';
import { NotificationEntity } from '../../../entities/notification.entity';
import {
  NotificationMessage,
  NotificationSender,
} from '../notification-sender.interface';

/** Writes to the in-app notification inbox (the bell in the kabinet's top nav). */
export class InAppSender implements NotificationSender {
  readonly channel = NotificationChannel.IN_APP;

  private readonly logger = new Logger(InAppSender.name);

  constructor(
    private readonly notificationsRepository: Repository<NotificationEntity>,
  ) {}

  async send(message: NotificationMessage): Promise<void> {
    if (!message.clinicId) {
      this.logger.warn('In-app notification is missing clinicId, skipping');
      return;
    }

    await this.notificationsRepository.save(
      this.notificationsRepository.create({
        clinicId: message.clinicId,
        userId: message.to,
        title: message.subject ?? 'Уведомление',
        body: message.body,
      }),
    );
  }
}
