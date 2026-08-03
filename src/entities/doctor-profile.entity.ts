import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { BranchEntity } from './branch.entity';
import { ClinicEntity } from './clinic.entity';
import { ServiceEntity } from './service.entity';
import { UserEntity } from './user.entity';

@Entity('doctor_profiles')
@Index(['clinicId'])
export class DoctorProfileEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column('uuid', { unique: true })
  userId: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  // Primary branch; scheduling may still span branches via DoctorScheduleEntity
  @Column('uuid', { nullable: true })
  branchId: string | null;

  @ManyToOne(() => BranchEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch: BranchEntity | null;

  // S3 object key, download via presigned URL
  @Column({ type: 'varchar', nullable: true })
  photoKey: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 0 })
  experienceYears: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  education: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  specializations: string[];

  @ManyToMany(() => ServiceEntity)
  @JoinTable({
    name: 'doctor_services',
    joinColumn: { name: 'doctorProfileId' },
    inverseJoinColumn: { name: 'serviceId' },
  })
  services: ServiceEntity[];

  @Column({ default: true })
  isActive: boolean;

  // Only doctors with this on are offered through the public online-booking widget.
  @Column({ default: false })
  acceptsOnlineBooking: boolean;

  // Caps how far ahead a patient can self-book this doctor through the public
  // widget; null = no limit. Doesn't affect staff creating appointments internally.
  @Column({ type: 'int', nullable: true })
  maxAdvanceBookingDays: number | null;
}
