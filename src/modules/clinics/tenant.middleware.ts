import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import { RequestWithTenant } from '../../common/types/request-with-tenant.type';
import { ClinicsService } from './clinics.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly clinicsService: ClinicsService,
    private readonly config: ConfigService,
  ) {}

  async use(
    req: RequestWithTenant,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const subdomain = this.extractSubdomain(req);

    if (subdomain) {
      const clinic = await this.clinicsService.findBySubdomain(subdomain);

      if (!clinic) {
        throw new NotFoundException(`Clinic "${subdomain}" not found`);
      }

      req.clinic = clinic;
    }

    next();
  }

  private extractSubdomain(req: RequestWithTenant): string | null {
    // Dev/testing override, e.g. curl -H "X-Clinic-Subdomain: smile"
    const headerValue = req.headers['x-clinic-subdomain'];

    if (typeof headerValue === 'string' && headerValue.length > 0) {
      return headerValue;
    }

    const appDomain = this.config.getOrThrow<string>('APP_DOMAIN');
    const host = (req.headers.host ?? '').split(':')[0];

    if (!host.endsWith(`.${appDomain}`)) {
      return null;
    }

    const subdomain = host.slice(0, -(appDomain.length + 1));

    // Ignore nested subdomains and www
    if (!subdomain || subdomain === 'www' || subdomain.includes('.')) {
      return null;
    }

    return subdomain;
  }
}
