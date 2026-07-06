import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { NotificationChannel } from '../common/enums/notification-channel.enum';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';

// Clinic-level rule: send a reminder via <channel> <offsetMinutes> before the visit
@Entity('reminder_settings')
@Index(['clinicId'])
@Unique(['clinicId', 'channel', 'offsetMinutes'])
export class ReminderSettingEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  // 60 = hour, 1440 = day, 10080 = week before the appointment
  @Column({ type: 'int' })
  offsetMinutes: number;

  @Column({ default: true })
  isEnabled: boolean;
}
