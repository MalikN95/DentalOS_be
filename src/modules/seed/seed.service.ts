import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { seedAdminUser } from '../../database/seeds/seed-admin';
import { seedPatients } from '../../database/seeds/seed-patients';
import { seedStaff } from '../../database/seeds/seed-staff';

/**
 * Seeds the default clinic, admin, staff and patients on application start
 * when SEED_ON_START=true. Every seeder is idempotent, so repeated boots
 * never duplicate rows.
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

    this.logger.log(
      'SEED_ON_START enabled — seeding admin, staff and patients...',
    );

    try {
      await seedAdminUser(this.dataSource);
      await seedStaff(this.dataSource);
      await seedPatients(this.dataSource);
      this.logger.log('Seed on start completed.');
    } catch (error) {
      this.logger.error(
        'Seed on start failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
