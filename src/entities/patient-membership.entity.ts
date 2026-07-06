import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { MembershipTemplateEntity } from './membership-template.entity';
import { PatientEntity } from './patient.entity';

export enum PatientMembershipStatus {
  ACTIVE = 'active',
  USED_UP = 'used_up',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('patient_memberships')
@Index(['patientId'])
export class PatientMembershipEntity extends BaseEntity {
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: PatientEntity;

  @Column('uuid')
  templateId: string;

  @ManyToOne(() => MembershipTemplateEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'templateId' })
  template: MembershipTemplateEntity;

  @Column({ type: 'int' })
  remainingVisits: number;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({
    type: 'enum',
    enum: PatientMembershipStatus,
    default: PatientMembershipStatus.ACTIVE,
  })
  status: PatientMembershipStatus;
}
