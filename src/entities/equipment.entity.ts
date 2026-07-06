import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { BranchEntity } from './branch.entity';
import { CabinetEntity } from './cabinet.entity';

export enum EquipmentStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  BROKEN = 'broken',
  DECOMMISSIONED = 'decommissioned',
}

@Entity('equipment')
@Index(['branchId'])
export class EquipmentEntity extends BaseEntity {
  @Column('uuid')
  branchId: string;

  @ManyToOne(() => BranchEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: BranchEntity;

  // Equipment may be assigned to a specific cabinet or belong to the branch as a whole
  @Column('uuid', { nullable: true })
  cabinetId: string | null;

  @ManyToOne(() => CabinetEntity, (cabinet) => cabinet.equipment, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'cabinetId' })
  cabinet: CabinetEntity | null;

  @Column()
  name: string;

  // Machine-readable kind ('xray', 'microscope', 'ct') matched against
  // ServiceEntity.requiredEquipmentTypes during booking
  @Column({ nullable: true, type: 'varchar' })
  type: string | null;

  @Column({ nullable: true, type: 'varchar' })
  serialNumber: string | null;

  @Column({
    type: 'enum',
    enum: EquipmentStatus,
    default: EquipmentStatus.ACTIVE,
  })
  status: EquipmentStatus;

  @Column({ nullable: true, type: 'date' })
  purchasedAt: string | null;

  @Column({ nullable: true, type: 'varchar' })
  notes: string | null;
}
