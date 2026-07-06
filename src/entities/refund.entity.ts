import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PaymentEntity } from './payment.entity';
import { UserEntity } from './user.entity';

@Entity('refunds')
@Index(['paymentId'])
export class RefundEntity extends BaseEntity {
  @Column('uuid')
  paymentId: string;

  @ManyToOne(() => PaymentEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paymentId' })
  payment: PaymentEntity;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column()
  reason: string;

  @Column('uuid', { nullable: true })
  processedById: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'processedById' })
  processedBy: UserEntity | null;
}
