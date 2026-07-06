import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';
import { DiscountEntity } from './discount.entity';

@Entity('promotions')
@Index(['clinicId'])
export class PromotionEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Discount applied when the promotion is used
  @Column('uuid', { nullable: true })
  discountId: string | null;

  @ManyToOne(() => DiscountEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'discountId' })
  discount: DiscountEntity | null;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column({ default: true })
  isActive: boolean;
}
