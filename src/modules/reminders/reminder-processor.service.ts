import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import { appointmentReminderCopy } from '../../common/notifications/notification-copy';
import {
  NOTIFICATION_LOCALE_INTL_TAG,
  resolveClinicNotificationContext,
} from '../../common/notifications/notification-locale';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { ReminderEntity, ReminderStatus } from '../../entities/reminder.entity';
import { NotificationsService } from '../notifications/notifications.service';

const TICK_INTERVAL_MS = 60_000;
const BATCH_SIZE = 100;

const PHONE_CHANNELS: ReadonlySet<NotificationChannel> = new Set([
  NotificationChannel.SMS,
  NotificationChannel.WHATSAPP,
  NotificationChannel.TELEGRAM,
]);

const SKIP_APPOINTMENT_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
]);

@Injectable()
export class ReminderProcessorService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ReminderProcessorService.name);

  private interval: ReturnType<typeof setInterval> | null = null;

  private isProcessing = false;

  constructor(
    @InjectRepository(ReminderEntity)
    private readonly remindersRepository: Repository<ReminderEntity>,
    @InjectRepository(ClinicEntity)
    private readonly clinicsRepository: Repository<ClinicEntity>,
    private readonly notificationsService: NotificationsService,
  ) {}

  onApplicationBootstrap(): void {
    this.interval = setInterval(() => {
      void this.tick();
    }, TICK_INTERVAL_MS);
    this.interval.unref();
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async tick(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const due = await this.remindersRepository.find({
        where: {
          status: ReminderStatus.PENDING,
          scheduledAt: LessThanOrEqual(new Date()),
        },
        relations: {
          appointment: {
            patient: true,
            service: true,
            doctorProfile: { user: true },
          },
        },
        order: { scheduledAt: 'ASC' },
        take: BATCH_SIZE,
      });

      await due.reduce(
        (chain, reminder) => chain.then(() => this.process(reminder)),
        Promise.resolve(),
      );
    } catch (error) {
      this.logger.error(
        `Reminder tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async process(reminder: ReminderEntity): Promise<void> {
    const { appointment } = reminder;

    if (SKIP_APPOINTMENT_STATUSES.has(appointment.status)) {
      await this.remindersRepository.update(reminder.id, {
        status: ReminderStatus.CANCELLED,
      });
      return;
    }

    if (!this.hasConsent(reminder.channel, appointment)) {
      await this.remindersRepository.update(reminder.id, {
        status: ReminderStatus.CANCELLED,
        error: 'patient opted out of this channel',
      });
      return;
    }

    if (reminder.channel === NotificationChannel.PUSH) {
      await this.processPush(reminder, appointment);
      return;
    }

    const to = this.resolveDestination(reminder.channel, appointment);

    if (!to) {
      await this.remindersRepository.update(reminder.id, {
        status: ReminderStatus.FAILED,
        error: 'no destination',
      });
      return;
    }

    try {
      await this.notificationsService.send(reminder.channel, {
        to,
        ...(await this.buildReminderCopy(appointment)),
      });

      await this.remindersRepository.update(reminder.id, {
        status: ReminderStatus.SENT,
        sentAt: new Date(),
        error: null,
      });
    } catch (error) {
      await this.remindersRepository.update(reminder.id, {
        status: ReminderStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Push fans out to every device token the patient has registered from the
  // booking widget, instead of a single `to` destination like the other channels.
  private async processPush(
    reminder: ReminderEntity,
    appointment: AppointmentEntity,
  ): Promise<void> {
    const tokens = appointment.patient.fcmTokens;

    if (tokens.length === 0) {
      await this.remindersRepository.update(reminder.id, {
        status: ReminderStatus.FAILED,
        error: 'no destination',
      });
      return;
    }

    try {
      const copy = await this.buildReminderCopy(appointment);
      await Promise.all(
        tokens.map((token) =>
          this.notificationsService.send(NotificationChannel.PUSH, {
            to: token,
            ...copy,
          }),
        ),
      );

      await this.remindersRepository.update(reminder.id, {
        status: ReminderStatus.SENT,
        sentAt: new Date(),
        error: null,
      });
    } catch (error) {
      await this.remindersRepository.update(reminder.id, {
        status: ReminderStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Only EMAIL/WHATSAPP/PUSH are exposed as opt-outs on the patient card;
  // every other channel (SMS, Telegram) is unaffected and always allowed, as before.
  private hasConsent(
    channel: NotificationChannel,
    appointment: AppointmentEntity,
  ): boolean {
    const prefs = appointment.patient.notificationPreferences;

    if (channel === NotificationChannel.EMAIL) {
      return prefs?.email ?? true;
    }

    if (channel === NotificationChannel.WHATSAPP) {
      return prefs?.whatsapp ?? true;
    }

    if (channel === NotificationChannel.PUSH) {
      return prefs?.push ?? true;
    }

    return true;
  }

  private resolveDestination(
    channel: NotificationChannel,
    appointment: AppointmentEntity,
  ): string | null {
    if (PHONE_CHANNELS.has(channel)) {
      return appointment.patient.phone || null;
    }

    if (channel === NotificationChannel.EMAIL) {
      return appointment.patient.email;
    }

    return null;
  }

  private async buildReminderCopy(
    appointment: AppointmentEntity,
  ): Promise<{ subject: string; body: string; clinicName: string }> {
    const { locale, clinicName } = await resolveClinicNotificationContext(
      this.clinicsRepository,
      appointment.clinicId,
    );
    const when = appointment.startsAt.toLocaleString(
      NOTIFICATION_LOCALE_INTL_TAG[locale],
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    );
    const doctor = appointment.doctorProfile.user;
    const doctorName = `${doctor.firstName} ${doctor.lastName}`;

    return {
      ...appointmentReminderCopy(locale, {
        when,
        serviceName: appointment.service.name,
        doctorName,
      }),
      clinicName,
    };
  }
}
