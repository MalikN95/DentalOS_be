import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { seedAdminUser } from '../../database/seeds/seed-admin';
import { seedAppointments } from '../../database/seeds/seed-appointments';
import { seedBranches } from '../../database/seeds/seed-branches';
import { seedCabinets } from '../../database/seeds/seed-cabinets';
import { seedInvoices } from '../../database/seeds/seed-invoices';
import { seedLeads } from '../../database/seeds/seed-leads';
import { seedPatients } from '../../database/seeds/seed-patients';
import { seedRandomPatients } from '../../database/seeds/seed-random-patients';
import { seedServices } from '../../database/seeds/seed-services';
import { seedStaff } from '../../database/seeds/seed-staff';

/**
 * Seeds the default clinic, admin, branches, staff, patients, services,
 * cabinets, appointments, invoices and leads on application start when
 * SEED_ON_START=true. Every seeder is idempotent, so repeated boots never
 * duplicate rows.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<boolean>('SEED_ON_START') !== true) {
      return;
    }

    this.logger.log('SEED_ON_START enabled — seeding demo data...');

    try {
      await seedAdminUser(this.dataSource);
      await seedBranches(this.dataSource);
      await seedStaff(this.dataSource);
      await seedPatients(this.dataSource);
      await seedRandomPatients(this.dataSource);
      await seedServices(this.dataSource);
      await seedCabinets(this.dataSource);
      await seedAppointments(this.dataSource);
      await seedInvoices(this.dataSource);
      await seedLeads(this.dataSource);
      this.logger.log('Seed on start completed.');
    } catch (error) {
      this.logger.error(
        'Seed on start failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
