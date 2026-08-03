import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';
import { PatientEntity } from './patient.entity';
import { UserEntity } from './user.entity';

export enum PatientMessageChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  // Patient-authored reply typed directly into the patient portal (no email/WhatsApp send involved).
  PORTAL = 'portal',
}

export enum PatientMessageDirection {
  // Clinic -> patient (email/WhatsApp send), written by EmailsService/NotificationsService.
  OUTBOUND = 'outbound',
  // Patient -> clinic, written by ChatService.receivePatientMessage from the patient portal.
  INBOUND = 'inbound',
}

// Log of every message exchanged with a patient — outbound sends (email/WhatsApp)
// and inbound patient-portal replies share this one timeline (see `direction`).
@Entity('patient_messages')
@Index(['clinicId', 'patientId', 'createdAt'])
export class PatientMessageEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: PatientEntity;

  @Column({ type: 'enum', enum: PatientMessageChannel })
  channel: PatientMessageChannel;

  @Column({
    type: 'enum',
    enum: PatientMessageDirection,
    default: PatientMessageDirection.OUTBOUND,
  })
  direction: PatientMessageDirection;

  // Email only — WhatsApp messages have no subject line.
  @Column({ type: 'varchar', nullable: true })
  subject: string | null;

  @Column({ type: 'text' })
  body: string;

  // Null means an automated send (reminder, review request, ...) with no acting staff user.
  @Column('uuid', { nullable: true })
  sentByUserId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sentByUserId' })
  sentBy: UserEntity | null;
}
