import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';

@Entity('patient_tags')
@Index(['clinicId'])
export class PatientTagEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column()
  name: string;

  // Hue in degrees (0-359). Null = derive a pastel color deterministically
  // from the tag's id on the client; set once the clinic rerolls or picks
  // a hue manually, so it stays stable afterwards.
  @Column({ type: 'int', nullable: true })
  color: number | null;
}
