import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { NotificationChannel } from '../common/enums/notification-channel.enum';
import { AppointmentEntity } from './appointment.entity';
import { BaseEntity } from './base.entity';

export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Concrete scheduled reminder for one appointment, produced from ReminderSettingEntity
@Entity('reminders')
@Index(['status', 'scheduledAt'])
@Index(['appointmentId'])
export class ReminderEntity extends BaseEntity {
  @Column('uuid')
  appointmentId: string;

  @ManyToOne(() => AppointmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointmentId' })
  appointment: AppointmentEntity;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({
    type: 'enum',
    enum: ReminderStatus,
    default: ReminderStatus.PENDING,
  })
  status: ReminderStatus;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  error: string | null;
}
