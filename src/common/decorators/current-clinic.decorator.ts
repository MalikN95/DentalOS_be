import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { ClinicEntity } from '../../entities/clinic.entity';
import { RequestWithTenant } from '../types/request-with-tenant.type';

export const CurrentClinic = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ClinicEntity => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();

    if (!request.clinic) {
      throw new BadRequestException(
        'Clinic could not be resolved from subdomain',
      );
    }

    return request.clinic;
  },
);
