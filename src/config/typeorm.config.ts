import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const buildTypeOrmOptions = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.getOrThrow<string>('POSTGRES_HOST'),
  port: config.getOrThrow<number>('POSTGRES_PORT'),
  username: config.getOrThrow<string>('POSTGRES_USER'),
  password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
  database: config.getOrThrow<string>('POSTGRES_DB'),
  autoLoadEntities: true,
  // Schema is managed via migrations only, never synchronize in any environment
  synchronize: true,
  migrations: ['dist/database/migrations/*.js'],
  migrationsRun: config.get<string>('NODE_ENV') === 'production',
});
