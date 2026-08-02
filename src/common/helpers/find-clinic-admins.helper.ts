import { In, Repository } from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { UserEntity } from '../../entities/user.entity';

export const CLINIC_ADMIN_ROLES = [UserRole.OWNER, UserRole.ADMIN] as const;

/** Every active owner/admin in a clinic — who clinic-wide alerts (new booking, cancellations, reviews, ...) go to. */
export const findClinicAdmins = (
  usersRepository: Repository<UserEntity>,
  clinicId: string,
): Promise<UserEntity[]> =>
  usersRepository.find({
    where: { clinicId, role: In(CLINIC_ADMIN_ROLES), isActive: true },
  });
