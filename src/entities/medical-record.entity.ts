import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppointmentEntity } from './appointment.entity';
import { BaseEntity } from './base.entity';
import { DoctorProfileEntity } from './doctor-profile.entity';
import { PatientEntity } from './patient.entity';

// One entry per visit: diagnosis + performed treatment
@Entity('medical_records')
@Index(['patientId'])
export class MedicalRecordEntity extends BaseEntity {
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: PatientEntity;

  @Column('uuid')
  doctorProfileId: string;

  @ManyToOne(() => DoctorProfileEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctorProfileId' })
  doctorProfile: DoctorProfileEntity;

  @Column('uuid', { nullable: true })
  appointmentId: string | null;

  @ManyToOne(() => AppointmentEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'appointmentId' })
  appointment: AppointmentEntity | null;

  @Column({ type: 'text' })
  diagnosis: string;

  @Column({ type: 'text', nullable: true })
  treatment: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
