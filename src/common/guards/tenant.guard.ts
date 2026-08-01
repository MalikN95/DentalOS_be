import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClinicsService } from '../../modules/clinics/clinics.service';
import { RequestWithTenant } from '../types/request-with-tenant.type';

/**
 * Resolves `request.clinic` — the one thing `@CurrentClinic()` reads.
 * Authenticated requests get their clinic from the JWT (`request.user.clinicId`);
 * public requests get it from a `:clinicSlug` route param (the booking widget).
 * Routes with neither (e.g. login, before a user is known) leave it unresolved —
 * `@CurrentClinic()` throws for those if a controller tries to use it anyway.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly clinicsService: ClinicsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();

    if (request.user) {
      const clinic = await this.clinicsService.findById(request.user.clinicId);

      if (!clinic) {
        throw new UnauthorizedException('Clinic not found');
      }

      request.clinic = clinic;
      return true;
    }

    const slug = request.params?.clinicSlug;

    if (typeof slug === 'string' && slug.length > 0) {
      const clinic = await this.clinicsService.findBySlug(slug);

      if (!clinic) {
        throw new NotFoundException(`Clinic "${slug}" not found`);
      }

      request.clinic = clinic;
    }

    return true;
  }
}
