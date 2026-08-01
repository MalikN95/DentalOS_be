export interface SeedConfig {
  clinicSlug: string;
  clinicName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  staffPassword: string;
}

export const getSeedConfig = (): SeedConfig => ({
  clinicSlug: process.env.SEED_CLINIC_SLUG ?? 'maximum',
  clinicName: process.env.SEED_CLINIC_NAME ?? 'Maximum Dental',
  adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@maximum.local',
  adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345',
  adminFirstName: process.env.SEED_ADMIN_FIRST_NAME ?? 'Admin',
  adminLastName: process.env.SEED_ADMIN_LAST_NAME ?? 'User',
  staffPassword: process.env.SEED_STAFF_PASSWORD ?? 'Staff12345',
});
