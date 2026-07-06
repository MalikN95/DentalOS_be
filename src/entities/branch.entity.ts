import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { WorkingHours } from '../common/types/working-hours.type';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';

@Entity('branches')
@Index(['clinicId'])
export class BranchEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column()
  name: string;

  @Column()
  address: string;

  // Map coordinates
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: string | null;

  @Column({ nullable: true, type: 'varchar' })
  phone: string | null;

  // Overrides clinic-level working hours when set
  @Column({ type: 'jsonb', nullable: true })
  workingHours: WorkingHours | null;

  @Column({ default: true })
  isActive: boolean;
}
