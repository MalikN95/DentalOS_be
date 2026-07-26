import { DataSource } from 'typeorm';
import { BranchEntity } from '../../entities/branch.entity';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { ensureClinic } from './seed-clinic';

const CABINETS_PER_BRANCH: { name: string; number: string }[] = [
  { name: 'Терапевтический', number: '1' },
  { name: 'Хирургический', number: '2' },
  { name: 'Ортодонтический', number: '3' },
];

/**
 * Creates 3 demo cabinets per branch. Idempotent by (branchId, name).
 */
export const seedCabinets = async (dataSource: DataSource): Promise<void> => {
  const clinic = await ensureClinic(dataSource);
  const branchRepository = dataSource.getRepository(BranchEntity);
  const cabinetRepository = dataSource.getRepository(CabinetEntity);

  const branches = await branchRepository.find({
    where: { clinicId: clinic.id },
  });

  await Promise.all(
    branches.flatMap((branch) =>
      CABINETS_PER_BRANCH.map(async (cabinet) => {
        const existing = await cabinetRepository.findOne({
          where: { branchId: branch.id, name: cabinet.name },
        });

        if (existing) {
          // eslint-disable-next-line no-console -- seed CLI output
          console.log(
            `Cabinet "${cabinet.name}" already exists at "${branch.name}"`,
          );
          return;
        }

        await cabinetRepository.save(
          cabinetRepository.create({
            branchId: branch.id,
            name: cabinet.name,
            number: cabinet.number,
            description: null,
            isActive: true,
          }),
        );
        // eslint-disable-next-line no-console -- seed CLI output
        console.log(`Created cabinet "${cabinet.name}" at "${branch.name}"`);
      }),
    ),
  );
};
