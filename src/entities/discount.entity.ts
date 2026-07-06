import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';

export enum DiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

@Entity('discounts')
@Index(['clinicId'])
export class DiscountEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: DiscountType })
  type: DiscountType;

  // Percent (0-100) or fixed amount depending on type
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  value: string;

  @Column({ type: 'timestamptz', nullable: true })
  validFrom: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  validTo: Date | null;

  @Column({ default: true })
  isActive: boolean;
}
