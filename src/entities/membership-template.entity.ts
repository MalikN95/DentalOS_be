import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';
import { ServiceEntity } from './service.entity';

// e.g. 'Whitening — 5 visits'
@Entity('membership_templates')
@Index(['clinicId'])
export class MembershipTemplateEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column()
  name: string;

  @Column('uuid')
  serviceId: string;

  @ManyToOne(() => ServiceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'serviceId' })
  service: ServiceEntity;

  @Column({ type: 'int' })
  totalVisits: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: string;

  // null = never expires
  @Column({ type: 'int', nullable: true })
  validityDays: number | null;

  @Column({ default: true })
  isActive: boolean;
}
