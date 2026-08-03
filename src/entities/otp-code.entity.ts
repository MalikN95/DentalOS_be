import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum OtpPurpose {
  SMS_LOGIN = 'sms_login',
  EMAIL_VERIFICATION = 'email_verification',
  MFA = 'mfa',
}

// Short-lived one-time codes for SMS login / email verification / MFA fallback
@Entity('otp_codes')
@Index(['destination', 'purpose'])
export class OtpCodeEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  // Phone number or email the code was sent to
  @Column()
  destination: string;

  @Column({ type: 'enum', enum: OtpPurpose })
  purpose: OtpPurpose;

  @Column({ select: false })
  codeHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ default: false })
  isUsed: boolean;

  // Dev/QA convenience only: the plaintext code, populated by SmsAuthService
  // ONLY when WhatsApp isn't actually configured and NODE_ENV isn't
  // 'production' (see SmsAuthService#shouldExposeDevPlainCode). Null in any
  // real deployment — staff can never read a patient's real login code.
  @Column({ type: 'varchar', nullable: true })
  devPlainCode: string | null;
}
