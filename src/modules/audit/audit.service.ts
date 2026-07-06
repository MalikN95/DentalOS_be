import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditLogEntity } from '../../entities/audit-log.entity';

export interface AuditEntry {
  clinicId: string;
  actorId?: string;
  action: AuditAction;
  entityName: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>,
  ) {}

  log(entry: AuditEntry): Promise<AuditLogEntity> {
    return this.auditRepository.save(
      this.auditRepository.create({
        clinicId: entry.clinicId,
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityName: entry.entityName,
        entityId: entry.entityId ?? null,
        before: entry.before ?? null,
        after: entry.after ?? null,
        ip: entry.ip ?? null,
      }),
    );
  }
}
