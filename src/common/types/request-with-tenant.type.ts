import type { Request } from 'express';
import { ClinicEntity } from '../../entities/clinic.entity';
import { JwtPayload } from './jwt-payload.type';

export type RequestWithTenant = Request & {
  clinic?: ClinicEntity;
  user?: JwtPayload;
};
