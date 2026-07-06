import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppointmentEntity } from './appointment.entity';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';
import { DoctorProfileEntity } from './doctor-profile.entity';
import { PatientEntity } from './patient.entity';

export enum ReviewStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
}

// Requested after the visit is completed; one review per appointment
@Entity('reviews')
@Index(['clinicId'])
export class ReviewEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column('uuid', { unique: true })
  appointmentId: string;

  @ManyToOne(() => AppointmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointmentId' })
  appointment: AppointmentEntity;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: PatientEntity;

  @Column('uuid')
  doctorProfileId: string;

  @ManyToOne(() => DoctorProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorProfileId' })
  doctorProfile: DoctorProfileEntity;

  // 1-5 stars
  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  status: ReviewStatus;

  // One-time token in the post-visit review link
  @Column({ type: 'varchar', nullable: true, unique: true })
  requestToken: string | null;
}
