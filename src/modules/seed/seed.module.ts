import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';

/**
 * DataSource and ConfigService are provided globally by the root TypeOrm/Config
 * modules, so SeedService needs no additional imports.
 */
@Module({
  providers: [SeedService],
})
export class SeedModule {}
