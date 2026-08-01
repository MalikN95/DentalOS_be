import { DataSource } from 'typeorm';
import { ClinicEntity } from '../../entities/clinic.entity';
import { getSeedConfig } from './seed.config';

/**
 * Finds the seed clinic by slug or creates it. Idempotent.
 * Shared by every seeder so they all target the same tenant.
 */
export const ensureClinic = async (
  dataSource: DataSource,
): Promise<ClinicEntity> => {
  const config = getSeedConfig();
  const clinicRepository = dataSource.getRepository(ClinicEntity);

  const existing = await clinicRepository.findOne({
    where: { slug: config.clinicSlug },
  });

  if (existing) {
    return existing;
  }

  const clinic = await clinicRepository.save(
    clinicRepository.create({
      name: config.clinicName,
      slug: config.clinicSlug,
      timezone: 'Europe/Moscow',
      currency: 'RUB',
      language: 'ru',
      isActive: true,
    }),
  );

  // eslint-disable-next-line no-console -- seed output
  console.log(`Created clinic "${clinic.name}" (${clinic.slug})`);

  return clinic;
};
