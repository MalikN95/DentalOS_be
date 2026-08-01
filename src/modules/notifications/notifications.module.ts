import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import { NotificationEntity } from '../../entities/notification.entity';
import { UserEntity } from '../../entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { MailService } from '../mail/mail.service';
import {
  NOTIFICATION_SENDERS,
  NotificationSender,
} from './notification-sender.interface';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { FcmSender } from './senders/fcm.sender';
import { InAppSender } from './senders/in-app.sender';
import { LogSender } from './senders/log.sender';
import { MailSender } from './senders/mail.sender';
import { WhatsAppSender } from './senders/whatsapp.sender';

const createSenders = (
  mailService: MailService,
  notificationsRepository: Repository<NotificationEntity>,
  config: ConfigService,
): NotificationSender[] =>
  Object.values(NotificationChannel).map((channel) => {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return new MailSender(mailService);
      case NotificationChannel.WHATSAPP:
        return new WhatsAppSender(config);
      case NotificationChannel.PUSH:
        return new FcmSender(config);
      case NotificationChannel.IN_APP:
        return new InAppSender(notificationsRepository);
      default:
        return new LogSender(channel);
    }
  });

@Global()
@Module({
  imports: [
    MailModule,
    TypeOrmModule.forFeature([NotificationEntity, UserEntity]),
  ],
  controllers: [NotificationsController],
  providers: [
    {
      provide: NOTIFICATION_SENDERS,
      useFactory: createSenders,
      inject: [
        MailService,
        getRepositoryToken(NotificationEntity),
        ConfigService,
      ],
    },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
