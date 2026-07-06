import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DoctorProfileEntity } from './doctor-profile.entity';

export enum ScheduleExceptionType {
  VACATION = 'vacation',
  SICK_LEAVE = 'sick_leave',
  HOLIDAY = 'holiday',
  DAY_OFF = 'day_off',
}

// Blocks booking for the doctor over an inclusive date range
@Entity('schedule_exceptions')
@Index(['doctorProfileId'])
export class ScheduleExceptionEntity extends BaseEntity {
  @Column('uuid')
  doctorProfileId: string;

  @ManyToOne(() => DoctorProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorProfileId' })
  doctorProfile: DoctorProfileEntity;

  @Column({ type: 'enum', enum: ScheduleExceptionType })
  type: ScheduleExceptionType;

  @Column({ type: 'date' })
  dateFrom: string;

  @Column({ type: 'date' })
  dateTo: string;

  @Column({ type: 'varchar', nullable: true })
  comment: string | null;
}
