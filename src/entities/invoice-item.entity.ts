import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { InvoiceEntity } from './invoice.entity';
import { ServiceEntity } from './service.entity';

@Entity('invoice_items')
@Index(['invoiceId'])
export class InvoiceItemEntity extends BaseEntity {
  @Column('uuid')
  invoiceId: string;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoiceId' })
  invoice: InvoiceEntity;

  @Column('uuid', { nullable: true })
  serviceId: string | null;

  @ManyToOne(() => ServiceEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'serviceId' })
  service: ServiceEntity | null;

  // Denormalized: survives service rename/removal
  @Column()
  title: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;
}
