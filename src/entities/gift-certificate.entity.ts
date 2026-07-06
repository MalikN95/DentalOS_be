import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';
import { PatientEntity } from './patient.entity';

export enum GiftCertificateStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('gift_certificates')
@Index(['clinicId'])
@Index(['clinicId', 'code'], { unique: true })
export class GiftCertificateEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column()
  code: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  initialAmount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balance: string;

  @Column({
    type: 'enum',
    enum: GiftCertificateStatus,
    default: GiftCertificateStatus.ACTIVE,
  })
  status: GiftCertificateStatus;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  // Holder, when known
  @Column('uuid', { nullable: true })
  patientId: string | null;

  @ManyToOne(() => PatientEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'patientId' })
  patient: PatientEntity | null;
}
