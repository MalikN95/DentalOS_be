import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';
import { PatientEntity } from './patient.entity';

export enum ReferralStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  REWARDED = 'rewarded',
}

// Referral program: referrer gets a reward once the referred patient completes a visit
@Entity('referrals')
@Index(['clinicId'])
export class ReferralEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column('uuid')
  referrerPatientId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrerPatientId' })
  referrerPatient: PatientEntity;

  @Column('uuid', { nullable: true })
  referredPatientId: string | null;

  @ManyToOne(() => PatientEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'referredPatientId' })
  referredPatient: PatientEntity | null;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  rewardAmount: string | null;
}
