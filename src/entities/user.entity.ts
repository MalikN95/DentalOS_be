import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import type { StaffNotificationPreferences } from '../common/types/notification-preferences.type';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';

@Entity('users')
@Index(['clinicId', 'email'], { unique: true })
// Staff/owner/admin login is a single global kabinet with no clinic context,
// so those emails must be unique system-wide. Patients stay clinic-scoped
// (the same person may have separate booking-widget accounts per clinic).
@Index('UQ_users_email_non_patient', ['email'], {
  unique: true,
  where: `"role" != 'patient'`,
})
export class UserEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column()
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  // Nullable: social/SMS-provisioned accounts have no local password
  @Column({ type: 'varchar', nullable: true, select: false })
  passwordHash: string | null;

  @Column({ default: false })
  mfaEnabled: boolean;

  // Base32 TOTP secret (RFC 6238)
  @Column({ type: 'varchar', nullable: true, select: false })
  mfaSecret: string | null;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.RECEPTIONIST })
  role: UserRole;

  // Id of the current refresh token (rotation); null = logged out
  @Column({ type: 'varchar', nullable: true, select: false })
  refreshJti: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'jsonb',
    default: () =>
      '\'{"email":true,"whatsapp":true,"push":true,"inApp":true,"reviewAlertMaxRating":3}\'',
  })
  notificationPreferences: StaffNotificationPreferences;

  // Web push (FCM) device tokens — a user may be logged in on several browsers/devices.
  @Column({ type: 'jsonb', default: () => "'[]'" })
  fcmTokens: string[];
}
