import { hash as bcryptHash } from 'bcrypt';
import { DataSource } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserEntity } from '../../entities/user.entity';
import { getSeedConfig } from './seed.config';

const BCRYPT_ROUNDS = 12;

export const seedSuperAdminUser = async (dataSource: DataSource): Promise<void> => {
  const config = getSeedConfig();
  const userRepository = dataSource.getRepository(UserEntity);

  // No clinicId — a super_admin isn't a member of any single clinic, so email
  // alone (globally unique for non-patient roles) identifies the account.
  const existingUser = await userRepository.findOne({
    where: { email: config.superAdminEmail },
  });

  const passwordHash = await bcryptHash(config.superAdminPassword, BCRYPT_ROUNDS);

  if (existingUser) {
    existingUser.passwordHash = passwordHash;
    existingUser.role = UserRole.SUPER_ADMIN;
    existingUser.isActive = true;

    await userRepository.save(existingUser);
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(`Updated super admin user ${config.superAdminEmail}`);
    return;
  }

  await userRepository.save(
    userRepository.create({
      clinicId: null,
      email: config.superAdminEmail,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      mfaEnabled: false,
    }),
  );

  // eslint-disable-next-line no-console -- seed CLI output
  console.log(`Created super admin user ${config.superAdminEmail}`);
};
