import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import { NotificationEntity } from '../../entities/notification.entity';
import { UserEntity } from '../../entities/user.entity';
import { NotificationListDto } from './dto/notification.dto';
import {
  NOTIFICATION_SENDERS,
  NotificationMessage,
  NotificationSender,
} from './notification-sender.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  private readonly senders: Map<NotificationChannel, NotificationSender>;

  constructor(
    @Inject(NOTIFICATION_SENDERS) senders: NotificationSender[],
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepository: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {
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

  async listForUser(
    clinicId: string,
    userId: string,
    page: number,
    limit: number,
    unreadOnly?: boolean,
  ): Promise<NotificationListDto> {
    const where = {
      clinicId,
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.notificationsRepository.find({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.notificationsRepository.count({ where }),
      this.notificationsRepository.count({
        where: { clinicId, userId, isRead: false },
      }),
    ]);

    return { items, total, unreadCount, page, limit };
  }

  async markAsRead(
    clinicId: string,
    userId: string,
    id: string,
  ): Promise<void> {
    await this.notificationsRepository.update(
      { id, clinicId, userId },
      { isRead: true },
    );
  }

  async markAllAsRead(clinicId: string, userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { clinicId, userId, isRead: false },
      { isRead: true },
    );
  }

  async registerPushToken(userId: string, token: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user || user.fcmTokens.includes(token)) {
      return;
    }

    await this.usersRepository.update(userId, {
      fcmTokens: [...user.fcmTokens, token],
    });
  }

  async unregisterPushToken(userId: string, token: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      return;
    }

    await this.usersRepository.update(userId, {
      fcmTokens: user.fcmTokens.filter((existing) => existing !== token),
    });
  }
}
