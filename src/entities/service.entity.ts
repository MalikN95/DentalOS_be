import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { CabinetEntity } from './cabinet.entity';
import { ClinicEntity } from './clinic.entity';
import { ServiceCategoryEntity } from './service-category.entity';

@Entity('services')
@Index(['clinicId'])
export class ServiceEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column('uuid', { nullable: true })
  categoryId: string | null;

  @ManyToOne(() => ServiceCategoryEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category: ServiceCategoryEntity | null;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: string;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Patient-facing preparation instructions
  @Column({ type: 'text', nullable: true })
  preparation: string | null;

  // Empty = any cabinet is allowed
  @ManyToMany(() => CabinetEntity)
  @JoinTable({
    name: 'service_cabinets',
    joinColumn: { name: 'serviceId' },
    inverseJoinColumn: { name: 'cabinetId' },
  })
  allowedCabinets: CabinetEntity[];

  // Matched against EquipmentEntity.type; empty = no equipment required
  @Column({ type: 'jsonb', default: () => "'[]'" })
  requiredEquipmentTypes: string[];

  @Column({ default: true })
  isActive: boolean;

  // Only services with this on are offered through the public online-booking widget.
  @Column({ default: false })
  acceptsOnlineBooking: boolean;
}
