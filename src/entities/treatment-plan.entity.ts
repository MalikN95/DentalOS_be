import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { DoctorProfileEntity } from './doctor-profile.entity';
import { PatientEntity } from './patient.entity';
import { TreatmentPlanItemEntity } from './treatment-plan-item.entity';

export enum TreatmentPlanStatus {
  DRAFT = 'draft',
  PROPOSED = 'proposed',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('treatment_plans')
@Index(['patientId'])
export class TreatmentPlanEntity extends BaseEntity {
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

  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: TreatmentPlanStatus,
    default: TreatmentPlanStatus.DRAFT,
  })
  status: TreatmentPlanStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => TreatmentPlanItemEntity, (item) => item.plan, {
    cascade: true,
  })
  items: TreatmentPlanItemEntity[];
}
