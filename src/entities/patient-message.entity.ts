import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';
import { PatientEntity } from './patient.entity';
import { UserEntity } from './user.entity';

export enum PatientMessageChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

// Read-only log of messages actually sent to a patient over email/WhatsApp —
// written by EmailsService/NotificationsService right after a send succeeds,
// never written to directly by staff (the Chats page only reads this table).
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
