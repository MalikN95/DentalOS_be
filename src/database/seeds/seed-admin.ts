import { hash as bcryptHash } from 'bcrypt';
import { DataSource } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserEntity } from '../../entities/user.entity';
import { ensureClinic } from './seed-clinic';
import { getSeedConfig } from './seed.config';

const BCRYPT_ROUNDS = 12;

export const seedAdminUser = async (dataSource: DataSource): Promise<void> => {
  const config = getSeedConfig();
  const userRepository = dataSource.getRepository(UserEntity);

  const clinic = await ensureClinic(dataSource);

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
