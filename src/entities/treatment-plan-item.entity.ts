import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ServiceEntity } from './service.entity';
import { TreatmentPlanEntity } from './treatment-plan.entity';

export enum TreatmentPlanItemStatus {
  PLANNED = 'planned',
  DONE = 'done',
  SKIPPED = 'skipped',
}

@Entity('treatment_plan_items')
@Index(['planId'])
export class TreatmentPlanItemEntity extends BaseEntity {
  @Column('uuid')
  planId: string;

  @ManyToOne(() => TreatmentPlanEntity, (plan) => plan.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'planId' })
  plan: TreatmentPlanEntity;

  @Column('uuid')
  serviceId: string;

  @ManyToOne(() => ServiceEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'serviceId' })
  service: ServiceEntity;

  // FDI tooth number (11-48), null when not tooth-specific
  @Column({ type: 'smallint', nullable: true })
  toothNumber: number | null;

  // Price snapshot at planning time
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: string;

  @Column({
    type: 'enum',
    enum: TreatmentPlanItemStatus,
    default: TreatmentPlanItemStatus.PLANNED,
  })
  status: TreatmentPlanItemStatus;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
