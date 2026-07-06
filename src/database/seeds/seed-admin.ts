import { hash as bcryptHash } from 'bcrypt';
import { DataSource } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { UserEntity } from '../../entities/user.entity';
import { getSeedConfig } from './seed.config';

const BCRYPT_ROUNDS = 12;

export const seedAdminUser = async (dataSource: DataSource): Promise<void> => {
  const config = getSeedConfig();
  const clinicRepository = dataSource.getRepository(ClinicEntity);
  const userRepository = dataSource.getRepository(UserEntity);

  let clinic = await clinicRepository.findOne({
    where: { subdomain: config.clinicSubdomain },
  });

  if (!clinic) {
    clinic = await clinicRepository.save(
      clinicRepository.create({
        name: config.clinicName,
        subdomain: config.clinicSubdomain,
        timezone: 'Europe/Moscow',
        currency: 'RUB',
        language: 'ru',
        isActive: true,
      }),
    );
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(`Created clinic "${clinic.name}" (${clinic.subdomain})`);
  } else {
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(`Clinic "${clinic.name}" (${clinic.subdomain}) already exists`);
  }

  const existingUser = await userRepository.findOne({
    where: { clinicId: clinic.id, email: config.adminEmail },
  });

  const passwordHash = await bcryptHash(config.adminPassword, BCRYPT_ROUNDS);

  if (existingUser) {
    existingUser.passwordHash = passwordHash;
    existingUser.role = UserRole.ADMIN;
    existingUser.isActive = true;
    existingUser.firstName = config.adminFirstName;
    existingUser.lastName = config.adminLastName;

    await userRepository.save(existingUser);
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(`Updated admin user ${config.adminEmail}`);
    return;
  }

  await userRepository.save(
    userRepository.create({
      clinicId: clinic.id,
      email: config.adminEmail,
      passwordHash,
      firstName: config.adminFirstName,
      lastName: config.adminLastName,
      role: UserRole.ADMIN,
      isActive: true,
      mfaEnabled: false,
    }),
  );

  // eslint-disable-next-line no-console -- seed CLI output
  console.log(`Created admin user ${config.adminEmail}`);
};
