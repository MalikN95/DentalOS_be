import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { BranchEntity } from './branch.entity';
import { DoctorProfileEntity } from './doctor-profile.entity';

// Weekly recurring schedule: one row per doctor per weekday per branch
@Entity('doctor_schedules')
@Index(['doctorProfileId'])
@Unique(['doctorProfileId', 'branchId', 'weekday'])
export class DoctorScheduleEntity extends BaseEntity {
  @Column('uuid')
  doctorProfileId: string;

  @ManyToOne(() => DoctorProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorProfileId' })
  doctorProfile: DoctorProfileEntity;

  @Column('uuid')
  branchId: string;

  @ManyToOne(() => BranchEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: BranchEntity;

  // 0 = Monday ... 6 = Sunday
  @Column({ type: 'smallint' })
  weekday: number;

  // 'HH:mm', clinic-local time
  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  @Column({ type: 'varchar', length: 5 })
  endTime: string;
}
