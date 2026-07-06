import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppointmentEntity } from './appointment.entity';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';
import { PatientEntity } from './patient.entity';

// CRM funnel: new → confirmed → arrived → paid → repeat visit
export enum LeadStage {
  NEW = 'new',
  CONFIRMED = 'confirmed',
  ARRIVED = 'arrived',
  PAID = 'paid',
  REPEAT_VISIT = 'repeat_visit',
  LOST = 'lost',
}

@Entity('leads')
@Index(['clinicId', 'stage'])
export class LeadEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'enum', enum: LeadStage, default: LeadStage.NEW })
  stage: LeadStage;

  // Where the lead came from: online booking, phone call, referral, ad campaign
  @Column({ type: 'varchar', nullable: true })
  source: string | null;

  @Column('uuid', { nullable: true })
  patientId: string | null;

  @ManyToOne(() => PatientEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'patientId' })
  patient: PatientEntity | null;

  @Column('uuid', { nullable: true })
  appointmentId: string | null;

  @ManyToOne(() => AppointmentEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'appointmentId' })
  appointment: AppointmentEntity | null;

  @Column({ type: 'varchar', nullable: true })
  comment: string | null;
}
