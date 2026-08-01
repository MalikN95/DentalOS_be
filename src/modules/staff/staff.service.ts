import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash as bcryptHash } from 'bcrypt';
import { Brackets, In, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { BranchEntity } from '../../entities/branch.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { UserEntity } from '../../entities/user.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import { StaffDoctorDto } from './dto/staff-doctor.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import {
  PaginatedResult,
  STAFF_ROLES,
  StaffMember,
  StaffDoctorProfile,
} from './staff.types';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(DoctorProfileEntity)
    private readonly doctorsRepository: Repository<DoctorProfileEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchesRepository: Repository<BranchEntity>,
    @InjectRepository(ServiceEntity)
    private readonly servicesRepository: Repository<ServiceEntity>,
  ) {}

  async findAll(
    clinicId: string,
    query: ListStaffQueryDto,
  ): Promise<PaginatedResult<StaffMember>> {
    const { page, limit, search, role, isActive } = query;

    const qb = this.usersRepository
      .createQueryBuilder('user')
      .where('user.clinicId = :clinicId', { clinicId })
      .andWhere('user.role IN (:...roles)', { roles: STAFF_ROLES });

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive });
    }

    if (search) {
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('user.firstName ILIKE :search')
            .orWhere('user.lastName ILIKE :search')
            .orWhere('user.email ILIKE :search')
            .orWhere('user.phone ILIKE :search');
        }),
      ).setParameter('search', `%${search}%`);
    }

    const [entities, total] = await qb
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const profiles = await this.findDoctorProfiles(clinicId, entities);
    const items = entities.map((user) =>
      this.toStaffMember(user, profiles.get(user.id) ?? null),
    );

    return { items, total, page, limit };
  }

  async findOne(clinicId: string, id: string): Promise<StaffMember> {
    const user = await this.getStaffUser(clinicId, id);
    const profile =
      user.role === UserRole.DOCTOR
        ? await this.doctorsRepository.findOne({
            where: { clinicId, userId: user.id },
            relations: { branch: true, services: true },
          })
        : null;

    return this.toStaffMember(user, profile);
  }

  async listSpecializationsCatalog(clinicId: string): Promise<string[]> {
    const rows: { value: string }[] = await this.doctorsRepository.query(
      `SELECT DISTINCT value FROM doctor_profiles, jsonb_array_elements_text(specializations) AS value WHERE "clinicId" = $1 AND "deletedAt" IS NULL ORDER BY value ASC`,
      [clinicId],
    );
    return rows.map((row) => row.value);
  }

  async create(clinicId: string, dto: CreateStaffDto): Promise<StaffMember> {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await bcryptHash(dto.password, BCRYPT_ROUNDS);

    // The (clinicId, email) unique index also covers soft-deleted rows,
    // so a previously removed employee is restored instead of re-inserted.
    const existing = await this.usersRepository.findOne({
      where: { clinicId, email },
      withDeleted: true,
    });

    if (existing && existing.deletedAt === null) {
      throw new ConflictException('Employee with this email already exists');
    }

    if (existing) {
      await this.usersRepository.restore({ id: existing.id });
    }

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        id: existing?.id,
        clinicId,
        email,
        phone: dto.phone?.trim() ?? null,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: dto.role,
        isActive: dto.isActive ?? true,
        mfaEnabled: false,
      }),
    );

    if (dto.role === UserRole.DOCTOR) {
      await this.upsertDoctorProfile(clinicId, user.id, dto.doctor ?? {});
    }

    return this.findOne(clinicId, user.id);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateStaffDto,
  ): Promise<StaffMember> {
    const user = await this.getStaffUser(clinicId, id);
    const patch: Partial<UserEntity> = {};

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();

      if (email !== user.email) {
        await this.assertEmailFree(clinicId, email);
        patch.email = email;
      }
    }

    if (dto.firstName !== undefined) {
      patch.firstName = dto.firstName.trim();
    }

    if (dto.lastName !== undefined) {
      patch.lastName = dto.lastName.trim();
    }

    if (dto.phone !== undefined) {
      patch.phone = dto.phone.trim() || null;
    }

    if (dto.role !== undefined) {
      patch.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
    }

    if (dto.password) {
      patch.passwordHash = await bcryptHash(dto.password, BCRYPT_ROUNDS);
    }

    const losesOwnership =
      user.role === UserRole.OWNER &&
      ((patch.role !== undefined && patch.role !== UserRole.OWNER) ||
        patch.isActive === false);

    if (losesOwnership) {
      await this.assertNotLastOwner(clinicId);
    }

    if (Object.keys(patch).length > 0) {
      // Explicit update keeps `select: false` columns (mfaSecret, refreshJti) untouched.
      await this.usersRepository.update({ id: user.id }, patch);
    }

    const nextRole = dto.role ?? user.role;

    if (nextRole === UserRole.DOCTOR) {
      if (dto.doctor !== undefined || dto.role === UserRole.DOCTOR) {
        await this.upsertDoctorProfile(clinicId, user.id, dto.doctor ?? {});
      }
    } else {
      await this.removeDoctorProfile(clinicId, user.id);
    }

    return this.findOne(clinicId, user.id);
  }

  async remove(
    clinicId: string,
    id: string,
    currentUserId: string,
  ): Promise<void> {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot remove your own account');
    }

    const user = await this.getStaffUser(clinicId, id);

    if (user.role === UserRole.OWNER) {
      await this.assertNotLastOwner(clinicId);
    }

    await this.removeDoctorProfile(clinicId, user.id);
    await this.usersRepository.softRemove(user);
  }

  private async getStaffUser(
    clinicId: string,
    id: string,
  ): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { id, clinicId, role: In(STAFF_ROLES) },
    });

    if (!user) {
      throw new NotFoundException('Employee not found');
    }

    return user;
  }

  private async assertEmailFree(
    clinicId: string,
    email: string,
  ): Promise<void> {
    const taken = await this.usersRepository.findOne({
      where: { clinicId, email },
      withDeleted: true,
    });

    if (taken) {
      throw new ConflictException('Employee with this email already exists');
    }
  }

  /** Guards the clinic against losing its last active owner. */
  private async assertNotLastOwner(clinicId: string): Promise<void> {
    const owners = await this.usersRepository.count({
      where: { clinicId, role: UserRole.OWNER, isActive: true },
    });

    if (owners <= 1) {
      throw new BadRequestException(
        'Clinic must keep at least one active owner',
      );
    }
  }

  private async findDoctorProfiles(
    clinicId: string,
    users: UserEntity[],
  ): Promise<Map<string, DoctorProfileEntity>> {
    const doctorIds = users
      .filter((user) => user.role === UserRole.DOCTOR)
      .map((user) => user.id);

    if (doctorIds.length === 0) {
      return new Map();
    }

    const profiles = await this.doctorsRepository.find({
      where: { clinicId, userId: In(doctorIds) },
      relations: { branch: true, services: true },
    });

    return new Map(profiles.map((profile) => [profile.userId, profile]));
  }

  private async upsertDoctorProfile(
    clinicId: string,
    userId: string,
    dto: StaffDoctorDto,
  ): Promise<void> {
    const branchId =
      dto.branchId === undefined || dto.branchId === null
        ? null
        : (await this.getOwnedBranch(clinicId, dto.branchId)).id;

    const existing = await this.doctorsRepository.findOne({
      where: { userId },
      relations: { services: true },
      withDeleted: true,
    });

    if (!existing) {
      await this.doctorsRepository.save(
        this.doctorsRepository.create({
          clinicId,
          userId,
          branchId,
          description: dto.description ?? null,
          experienceYears: dto.experienceYears ?? 0,
          education: dto.education ?? [],
          specializations: dto.specializations ?? [],
          acceptsOnlineBooking: dto.acceptsOnlineBooking ?? false,
          services: dto.serviceIds
            ? await this.getOwnedServices(clinicId, dto.serviceIds)
            : [],
          isActive: true,
        }),
      );
      return;
    }

    if (existing.deletedAt !== null) {
      await this.doctorsRepository.restore({ id: existing.id });
    }

    if (dto.branchId !== undefined) {
      existing.branchId = branchId;
    }

    if (dto.description !== undefined) {
      existing.description = dto.description;
    }

    if (dto.experienceYears !== undefined) {
      existing.experienceYears = dto.experienceYears;
    }

    if (dto.education !== undefined) {
      existing.education = dto.education;
    }

    if (dto.specializations !== undefined) {
      existing.specializations = dto.specializations;
    }

    if (dto.acceptsOnlineBooking !== undefined) {
      existing.acceptsOnlineBooking = dto.acceptsOnlineBooking;
    }

    if (dto.serviceIds !== undefined) {
      existing.services = await this.getOwnedServices(clinicId, dto.serviceIds);
    }

    existing.isActive = true;

    await this.doctorsRepository.save(existing);
  }

  private async getOwnedServices(
    clinicId: string,
    serviceIds: string[],
  ): Promise<ServiceEntity[]> {
    if (serviceIds.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(serviceIds)];
    const services = await this.servicesRepository.find({
      where: { id: In(uniqueIds), clinicId },
    });

    if (services.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more services do not belong to this clinic',
      );
    }

    return services;
  }

  private async removeDoctorProfile(
    clinicId: string,
    userId: string,
  ): Promise<void> {
    const profile = await this.doctorsRepository.findOne({
      where: { clinicId, userId },
    });

    if (profile) {
      await this.doctorsRepository.softRemove(profile);
    }
  }

  private async getOwnedBranch(
    clinicId: string,
    branchId: string,
  ): Promise<BranchEntity> {
    const branch = await this.branchesRepository.findOne({
      where: { id: branchId, clinicId },
    });

    if (!branch) {
      throw new BadRequestException('Branch does not belong to this clinic');
    }

    return branch;
  }

  private toStaffMember(
    user: UserEntity,
    profile: DoctorProfileEntity | null,
  ): StaffMember {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      doctorProfile: profile ? this.toDoctorProfile(profile) : null,
    };
  }

  private toDoctorProfile(profile: DoctorProfileEntity): StaffDoctorProfile {
    return {
      id: profile.id,
      branchId: profile.branchId,
      branchName: profile.branch?.name ?? null,
      specializations: profile.specializations,
      education: profile.education,
      experienceYears: profile.experienceYears,
      description: profile.description,
      isActive: profile.isActive,
      acceptsOnlineBooking: profile.acceptsOnlineBooking,
      services: (profile.services ?? []).map((service) => ({
        id: service.id,
        name: service.name,
      })),
    };
  }
}
