import { LeadEntity, LeadStage } from '../../../entities/lead.entity';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface FunnelResult {
  stages: Record<LeadStage, LeadEntity[]>;
  counts: Record<LeadStage, number>;
}
