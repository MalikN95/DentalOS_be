import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { BaseEntity } from './base.entity';
import { BranchEntity } from './branch.entity';
import { CabinetEntity } from './cabinet.entity';
import { ClinicEntity } from './clinic.entity';
import { DoctorProfileEntity } from './doctor-profile.entity';
import { PatientEntity } from './patient.entity';
import { ServiceEntity } from './service.entity';

export enum AppointmentSource {
  ONLINE = 'online',
  RECEPTION = 'reception',
}

@Entity('appointments')
@Index(['clinicId', 'startsAt'])
@Index(['doctorProfileId', 'startsAt'])
@Index(['patientId'])
export class AppointmentEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column('uuid')
  branchId: string;

  @ManyToOne(() => BranchEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: BranchEntity;

  @Column('uuid')
  doctorProfileId: string;

  @ManyToOne(() => DoctorProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorProfileId' })
  doctorProfile: DoctorProfileEntity;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: PatientEntity;

  @Column('uuid')
  serviceId: string;

  @ManyToOne(() => ServiceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'serviceId' })
  service: ServiceEntity;

  @Column('uuid', { nullable: true })
  cabinetId: string | null;

  @ManyToOne(() => CabinetEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cabinetId' })
  cabinet: CabinetEntity | null;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @Column({
    type: 'enum',
    enum: AppointmentSource,
    default: AppointmentSource.RECEPTION,
  })
  source: AppointmentSource;

  // Price snapshot at booking time; service price may change later
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: string;

  @Column({ type: 'varchar', nullable: true })
  comment: string | null;

  @Column({ type: 'varchar', nullable: true })
  cancellationReason: string | null;
}
