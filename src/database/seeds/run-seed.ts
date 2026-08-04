import { dataSource } from '../data-source';
import { getSeedConfig } from './seed.config';
import { seedAdminUser } from './seed-admin';
import { seedAppointments } from './seed-appointments';
import { seedBranches } from './seed-branches';
import { seedCabinets } from './seed-cabinets';
import { seedInvoices } from './seed-invoices';
import { seedLeads } from './seed-leads';
import { seedPatients } from './seed-patients';
import { seedRandomPatients } from './seed-random-patients';
import { seedReviews } from './seed-reviews';
import { seedServices } from './seed-services';
import { seedStaff } from './seed-staff';
import { seedSuperAdminUser } from './seed-super-admin';

const runSeed = async (): Promise<void> => {
  const config = getSeedConfig();

  await dataSource.initialize();
  // eslint-disable-next-line no-console -- seed CLI output
  console.log('Running seed...');

  try {
    await seedAdminUser(dataSource);
    await seedSuperAdminUser(dataSource);
    await seedBranches(dataSource);
    await seedStaff(dataSource);
    await seedPatients(dataSource);
    await seedRandomPatients(dataSource);
    await seedServices(dataSource);
    await seedCabinets(dataSource);
    await seedAppointments(dataSource);
    await seedInvoices(dataSource);
    await seedReviews(dataSource);
    await seedLeads(dataSource);
    // eslint-disable-next-line no-console -- seed CLI output
    console.log('Seed completed.');
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(`Admin login: ${config.adminEmail} / ${config.adminPassword}`);
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(`Staff password: ${config.staffPassword}`);
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(
      `Super admin login: ${config.superAdminEmail} / ${config.superAdminPassword}`,
    );
    // eslint-disable-next-line no-console -- seed CLI output
    console.log('Login: http://localhost:3000/login');
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(
      `Booking widget: http://localhost:3000/book/${config.clinicSlug}`,
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
