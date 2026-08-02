import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import { NotificationEntity } from '../../entities/notification.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { UserEntity } from '../../entities/user.entity';
import { NotificationListDto } from './dto/notification.dto';
import {
  NOTIFICATION_SENDERS,
  NotificationMessage,
  NotificationSender,
} from './notification-sender.interface';

export interface NotifyMessage {
  subject?: string;
  body: string;
}

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

  /** Notifies a staff member on every channel they've enabled (email/whatsapp/push/inApp). */
  async notifyStaffMember(
    user: UserEntity,
    message: NotifyMessage,
  ): Promise<void> {
    const prefs = user.notificationPreferences;
    const sends: Promise<void>[] = [];

    if (prefs.email && user.email) {
      sends.push(
        this.send(NotificationChannel.EMAIL, { to: user.email, ...message }),
      );
    }

    if (prefs.whatsapp && user.phone) {
      sends.push(
        this.send(NotificationChannel.WHATSAPP, {
          to: user.phone,
          body: message.body,
        }),
      );
    }

    if (prefs.push) {
      sends.push(
        ...user.fcmTokens.map((token) =>
          this.send(NotificationChannel.PUSH, { to: token, ...message }),
        ),
      );
    }

    if (prefs.inApp) {
      sends.push(
        this.send(NotificationChannel.IN_APP, {
          to: user.id,
          ...message,
          clinicId: user.clinicId,
        }),
      );
    }

    await Promise.allSettled(sends);
  }

  /** Notifies every staff member in the list — see notifyStaffMember(). */
  async notifyStaffMembers(
    users: UserEntity[],
    message: NotifyMessage,
  ): Promise<void> {
    await Promise.allSettled(
      users.map((user) => this.notifyStaffMember(user, message)),
    );
  }

  /** Notifies a patient on every channel they've enabled (email/whatsapp/push). */
  async notifyPatient(
    patient: PatientEntity,
    message: NotifyMessage,
  ): Promise<void> {
    const prefs = patient.notificationPreferences;
    const sends: Promise<void>[] = [];

    if (prefs.email && patient.email) {
      sends.push(
        this.send(NotificationChannel.EMAIL, { to: patient.email, ...message }),
      );
    }

    if (prefs.whatsapp && patient.phone) {
      sends.push(
        this.send(NotificationChannel.WHATSAPP, {
          to: patient.phone,
          body: message.body,
        }),
      );
    }

    if (prefs.push) {
      sends.push(
        ...patient.fcmTokens.map((token) =>
          this.send(NotificationChannel.PUSH, { to: token, ...message }),
        ),
      );
    }

    await Promise.allSettled(sends);
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
