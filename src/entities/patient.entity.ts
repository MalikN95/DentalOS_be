import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { Gender } from '../common/enums/gender.enum';
import type { PatientNotificationPreferences } from '../common/types/notification-preferences.type';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';
import { PatientTagEntity } from './patient-tag.entity';
import { UserEntity } from './user.entity';

export interface PatientInsurance {
  company: string;
  policyNumber: string;
  validUntil: string | null; // 'YYYY-MM-DD'
}

@Entity('patients')
@Index(['clinicId'])
@Index(['clinicId', 'phone'])
export class PatientEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  // Set when the patient has a portal account (UserRole.PATIENT)
  @Column('uuid', { nullable: true })
  userId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: UserEntity | null;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender | null;

  @Column()
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'jsonb', nullable: true })
  insurance: PatientInsurance | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  allergies: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  chronicDiseases: string[];

  @Column({ type: 'varchar', nullable: true })
  comments: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'jsonb',
    default: () => '\'{"email":true,"whatsapp":true,"push":true}\'',
  })
  notificationPreferences: PatientNotificationPreferences;

  // Web push (FCM) device tokens registered from the booking widget.
  @Column({ type: 'jsonb', default: () => "'[]'" })
  fcmTokens: string[];

  @ManyToMany(() => PatientTagEntity)
  @JoinTable({
    name: 'patient_tag_assignments',
    joinColumn: { name: 'patientId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: PatientTagEntity[];
}
