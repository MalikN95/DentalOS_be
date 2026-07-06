import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { BranchEntity } from './branch.entity';
import { EquipmentEntity } from './equipment.entity';

@Entity('cabinets')
@Index(['branchId'])
export class CabinetEntity extends BaseEntity {
  @Column('uuid')
  branchId: string;

  @ManyToOne(() => BranchEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: BranchEntity;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'varchar' })
  number: string | null;

  @Column({ nullable: true, type: 'varchar' })
  description: string | null;

  @OneToMany(() => EquipmentEntity, (equipment) => equipment.cabinet)
  equipment: EquipmentEntity[];

  @Column({ default: true })
  isActive: boolean;
}
