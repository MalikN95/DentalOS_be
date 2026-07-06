import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DoctorProfileEntity } from './doctor-profile.entity';
import { PatientEntity } from './patient.entity';

export enum ToothCondition {
  HEALTHY = 'healthy',
  CARIES = 'caries',
  FILLING = 'filling',
  EXTRACTED = 'extracted',
  IMPLANT = 'implant',
  CROWN = 'crown',
}

// Interactive dental chart: current state = latest mark per tooth,
// full history preserved for the patient timeline
@Entity('tooth_marks')
@Index(['patientId', 'toothNumber'])
export class ToothMarkEntity extends BaseEntity {
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: PatientEntity;

  // FDI two-digit notation: 11-18, 21-28, 31-38, 41-48
  @Column({ type: 'smallint' })
  toothNumber: number;

  @Column({ type: 'enum', enum: ToothCondition })
  condition: ToothCondition;

  @Column('uuid', { nullable: true })
  doctorProfileId: string | null;

  @ManyToOne(() => DoctorProfileEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'doctorProfileId' })
  doctorProfile: DoctorProfileEntity | null;

  @Column({ type: 'varchar', nullable: true })
  comment: string | null;
}
