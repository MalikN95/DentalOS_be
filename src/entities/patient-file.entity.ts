import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { MedicalRecordEntity } from './medical-record.entity';
import { PatientEntity } from './patient.entity';

export enum PatientFileType {
  PHOTO = 'photo',
  XRAY = 'xray',
  DOCUMENT = 'document',
}

@Entity('patient_files')
@Index(['patientId'])
export class PatientFileEntity extends BaseEntity {
  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: PatientEntity;

  // Optional link to the visit the file belongs to
  @Column('uuid', { nullable: true })
  medicalRecordId: string | null;

  @ManyToOne(() => MedicalRecordEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'medicalRecordId' })
  medicalRecord: MedicalRecordEntity | null;

  @Column({ type: 'enum', enum: PatientFileType })
  type: PatientFileType;

  // Optional link to a specific tooth (FDI notation), e.g. an X-ray of tooth 36
  @Column('int', { nullable: true })
  toothNumber: number | null;

  // S3 object key, download via presigned URL
  @Column()
  fileKey: string;

  @Column()
  fileName: string;

  @Column()
  mimeType: string;

  @Column({ type: 'int', default: 0 })
  sizeBytes: number;
}
