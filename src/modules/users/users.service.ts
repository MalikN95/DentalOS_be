import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserEntity } from '../../entities/user.entity';

export interface CreateUserData {
  clinicId: string;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  passwordHash?: string | null;
}

export interface MfaPatch {
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  // Staff/owner/admin login has no clinic context — email alone resolves the
  // account (enforced globally unique for non-patient roles at the DB level).
  findStaffByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .andWhere('user.role != :patient', { patient: UserRole.PATIENT })
      .andWhere('user.isActive = true')
      .getOne();
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id, isActive: true } });
  }

  findByEmail(clinicId: string, email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { clinicId, email, isActive: true },
    });
  }

  findByPhone(clinicId: string, phone: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { clinicId, phone, isActive: true },
    });
  }

  createUser(data: CreateUserData): Promise<UserEntity> {
    const user = this.usersRepository.create({
      clinicId: data.clinicId,
      email: data.email,
      phone: data.phone ?? null,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      passwordHash: data.passwordHash ?? null,
    });

    return this.usersRepository.save(user);
  }

  async findMfaSecret(userId: string): Promise<string | null> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.mfaSecret')
      .where('user.id = :userId', { userId })
      .andWhere('user.isActive = true')
      .getOne();

    return user?.mfaSecret ?? null;
  }

  async updateMfa(userId: string, patch: MfaPatch): Promise<void> {
    await this.usersRepository.update({ id: userId }, patch);
  }

  async updateRefreshJti(userId: string, jti: string | null): Promise<void> {
    await this.usersRepository.update({ id: userId }, { refreshJti: jti });
  }

  // Staff/owner/admin email is globally unique (DB partial unique index
  // `UQ_users_email_non_patient`) — this is the app-level check that turns a
  // conflict into a clean 409 instead of a raw constraint violation.
  async isEmailTakenByAnotherUser(
    userId: string,
    email: string,
  ): Promise<boolean> {
    const existing = await this.usersRepository.findOne({
      where: { email, role: Not(UserRole.PATIENT) },
      withDeleted: true,
    });

    return Boolean(existing && existing.id !== userId);
  }

  async updateProfile(
    userId: string,
    patch: {
      firstName?: string;
      lastName?: string;
      email?: string;
      avatarKey?: string;
    },
  ): Promise<UserEntity> {
    // Only apply provided fields — an omitted field must stay untouched, not
    // get wiped by a blind save of an entity with undefined columns.
    const definedFields = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
    await this.usersRepository.update({ id: userId }, definedFields);

    const updated = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated;
  }

  async findRefreshJti(userId: string): Promise<string | null> {
    const row = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.refreshJti', 'jti')
      .where('user.id = :userId', { userId })
      .andWhere('user.isActive = true')
      .getRawOne<{ jti: string | null }>();

    return row?.jti ?? null;
  }
}
