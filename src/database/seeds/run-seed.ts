import { dataSource } from '../data-source';
import { getSeedConfig } from './seed.config';
import { seedAdminUser } from './seed-admin';

const runSeed = async (): Promise<void> => {
  const config = getSeedConfig();

  await dataSource.initialize();
  // eslint-disable-next-line no-console -- seed CLI output
  console.log('Running seed...');

  try {
    await seedAdminUser(dataSource);
    // eslint-disable-next-line no-console -- seed CLI output
    console.log('Seed completed.');
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(`Login: ${config.adminEmail} / ${config.adminPassword}`);
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(
      `Subdomain: ${config.clinicSubdomain} → http://${config.clinicSubdomain}.localhost:3000/login`,
    );
  } finally {
    await dataSource.destroy();
  }
};

void runSeed().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- seed CLI output
  console.error('Seed failed:', error);
  throw error;
});
