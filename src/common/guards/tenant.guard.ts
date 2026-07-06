import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RequestWithTenant } from '../types/request-with-tenant.type';

/**
 * Rejects requests where the JWT was issued for a different clinic
 * than the one resolved from the subdomain.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();

    if (!request.user || !request.clinic) {
      return true;
    }

    if (request.user.clinicId !== request.clinic.id) {
      throw new ForbiddenException('Token was issued for another clinic');
    }

    return true;
  }
}
