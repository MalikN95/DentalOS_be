import { DataSource } from 'typeorm';
import { WorkingHours } from '../../common/types/working-hours.type';
import { BranchEntity } from '../../entities/branch.entity';
import { ensureClinic } from './seed-clinic';

const WEEKDAY_HOURS: WorkingHours = {
  mon: { from: '09:00', to: '20:00' },
  tue: { from: '09:00', to: '20:00' },
  wed: { from: '09:00', to: '20:00' },
  thu: { from: '09:00', to: '20:00' },
  fri: { from: '09:00', to: '20:00' },
  sat: { from: '10:00', to: '16:00' },
  sun: null,
};

interface BranchSeed {
  name: string;
  address: string;
  phone: string;
  latitude: string;
  longitude: string;
}

const BRANCHES: BranchSeed[] = [
  {
    name: 'Центральный',
    address: 'г. Москва, ул. Тверская, 12',
    phone: '+74951110001',
    latitude: '55.7614000',
    longitude: '37.6094000',
  },
  {
    name: 'Филиал на Ленинском',
    address: 'г. Москва, Ленинский проспект, 78',
    phone: '+74951110002',
    latitude: '55.6889000',
    longitude: '37.5586000',
  },
];

/**
 * Creates the demo branches. Idempotent by (clinicId, name);
 * seeded doctors are attached to these branches by name.
 */
export const seedBranches = async (dataSource: DataSource): Promise<void> => {
  const clinic = await ensureClinic(dataSource);
  const branchRepository = dataSource.getRepository(BranchEntity);

  await Promise.all(
    BRANCHES.map(async (branch) => {
      const existing = await branchRepository.findOne({
        where: { clinicId: clinic.id, name: branch.name },
      });

      if (existing) {
        // eslint-disable-next-line no-console -- seed CLI output
        console.log(`Branch "${branch.name}" already exists`);
        return;
      }

      await branchRepository.save(
        branchRepository.create({
          clinicId: clinic.id,
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
          latitude: branch.latitude,
          longitude: branch.longitude,
          workingHours: WEEKDAY_HOURS,
          isActive: true,
        }),
      );

      // eslint-disable-next-line no-console -- seed CLI output
      console.log(`Created branch "${branch.name}"`);
    }),
  );
};
