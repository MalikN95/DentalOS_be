import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { AppointmentEntity } from './appointment.entity';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';
import { DiscountEntity } from './discount.entity';
import { InvoiceItemEntity } from './invoice-item.entity';
import { PatientEntity } from './patient.entity';
import { PromoCodeEntity } from './promo-code.entity';

export enum InvoiceStatus {
  PENDING = 'pending',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

@Entity('invoices')
@Index(['clinicId'])
@Index(['patientId'])
export class InvoiceEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patientId' })
  patient: PatientEntity;

  @Column('uuid', { nullable: true })
  appointmentId: string | null;

  @ManyToOne(() => AppointmentEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'appointmentId' })
  appointment: AppointmentEntity | null;

  // Sequential per clinic, e.g. 'INV-000042'
  @Column()
  number: string;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: string;

  @Column('uuid', { nullable: true })
  discountId: string | null;

  @ManyToOne(() => DiscountEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'discountId' })
  discount: DiscountEntity | null;

  @Column('uuid', { nullable: true })
  promoCodeId: string | null;

  @ManyToOne(() => PromoCodeEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'promoCodeId' })
  promoCode: PromoCodeEntity | null;

  @OneToMany(() => InvoiceItemEntity, (item) => item.invoice, {
    cascade: true,
  })
  items: InvoiceItemEntity[];
}
