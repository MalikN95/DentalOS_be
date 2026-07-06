import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  ACCESS = 'access',
}

@Entity('audit_logs')
@Index(['clinicId', 'createdAt'])
@Index(['entityName', 'entityId'])
export class AuditLogEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @Column('uuid', { nullable: true })
  actorId: string | null;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column()
  entityName: string;

  @Column('uuid', { nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, unknown> | null;

  @Column({ nullable: true, type: 'varchar' })
  ip: string | null;
}
