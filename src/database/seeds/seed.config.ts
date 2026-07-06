export interface SeedConfig {
  clinicSubdomain: string;
  clinicName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

export const getSeedConfig = (): SeedConfig => ({
  clinicSubdomain: process.env.SEED_CLINIC_SUBDOMAIN ?? 'maximum',
  clinicName: process.env.SEED_CLINIC_NAME ?? 'Maximum Dental',
  adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@maximum.local',
  adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345',
  adminFirstName: process.env.SEED_ADMIN_FIRST_NAME ?? 'Admin',
  adminLastName: process.env.SEED_ADMIN_LAST_NAME ?? 'User',
});
