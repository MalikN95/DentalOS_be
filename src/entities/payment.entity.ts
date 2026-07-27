import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { GiftCertificateEntity } from './gift-certificate.entity';
import { InvoiceEntity } from './invoice.entity';
import { UserEntity } from './user.entity';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  GIFT_CERTIFICATE = 'gift_certificate',
  MEMBERSHIP = 'membership',
}
@Entity('payments')
@Index(['invoiceId'])
export class PaymentEntity extends BaseEntity {
  @Column('uuid')
  invoiceId: string;

  @ManyToOne(() => InvoiceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: InvoiceEntity;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  // Set when method = GIFT_CERTIFICATE
  @Column('uuid', { nullable: true })
  giftCertificateId: string | null;

  @ManyToOne(() => GiftCertificateEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'giftCertificateId' })
  giftCertificate: GiftCertificateEntity | null;

  // Fiscal receipt number
  @Column({ type: 'varchar', nullable: true })
  receiptNumber: string | null;

  // Cashier / receptionist who accepted the payment
  @Column('uuid', { nullable: true })
  receivedById: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'receivedById' })
  receivedBy: UserEntity | null;
}
