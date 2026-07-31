import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PatientEntity } from './patient.entity';
import { UserEntity } from './user.entity';

@Entity('patient_notes')
@Index(['patientId'])
export class PatientNoteEntity extends BaseEntity {
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: PatientEntity;

  @Column('uuid')
  authorUserId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorUserId' })
  author: UserEntity;

  @Column({ type: 'text' })
  text: string;
}
