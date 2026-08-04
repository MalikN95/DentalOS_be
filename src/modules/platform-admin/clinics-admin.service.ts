import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { hash as bcryptHash } from 'bcrypt';
import { DataSource, FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { PaymentEntity } from '../../entities/payment.entity';
import { UserEntity } from '../../entities/user.entity';
import { CreateClinicAdminDto } from './dto/create-clinic-admin.dto';
import { ListClinicsAdminQueryDto } from './dto/list-clinics-admin-query.dto';
import { UpdateClinicAdminDto } from './dto/update-clinic-admin.dto';
import {
  ClinicAdminDetail,
  ClinicAdminSummary,
} from './types/platform-admin-results.type';

export interface PaginatedClinics {
  items: ClinicAdminSummary[];
  total: number;
  page: number;
  limit: number;
}

const BCRYPT_ROUNDS = 12;

@Injectable()
export class ClinicsAdminService {
  constructor(
    @InjectRepository(ClinicEntity)
    private readonly clinicsRepository: Repository<ClinicEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async list(query: ListClinicsAdminQueryDto): Promise<PaginatedClinics> {
    const { page, limit } = query;

    const [clinics, total] = await this.clinicsRepository.findAndCount({
      where: this.buildListWhere(query),
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const counts = await this.countByClinicIds(clinics.map((clinic) => clinic.id));

    return {
      items: clinics.map((clinic) => this.toSummary(clinic, counts)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<ClinicAdminDetail> {
    const clinic = await this.findClinicOrFail(id);
    const counts = await this.countByClinicIds([clinic.id]);

    const revenueRow = await this.paymentsRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.invoice', 'invoice')
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .where('invoice.clinicId = :clinicId', { clinicId: clinic.id })
      .getRawOne<{ total: string }>();

    return {
      ...this.toSummary(clinic, counts),
      totalRevenue: Number(revenueRow?.total ?? 0),
    };
  }

  // Every clinic needs at least one user who can actually log into it, so
  // creating a clinic and its first (OWNER) user is one atomic operation —
  // a clinic with no admin would be unreachable dead weight.
  async create(dto: CreateClinicAdminDto): Promise<ClinicAdminDetail> {
    const { admin, ...clinicFields } = dto;
    const slug = dto.slug.toLowerCase();
    const adminEmail = admin.email.toLowerCase();

    // withDeleted: the DB's unique constraint on `slug` doesn't know about
    // soft-delete, so a slug held by a soft-deleted clinic is still taken.
    const slugTaken = await this.clinicsRepository.count({
      where: { slug },
      withDeleted: true,
    });

    if (slugTaken > 0) {
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    // Staff login has no clinic context (single global kabinet), so the
    // admin's email must be free across every clinic, not just this new one.
    const emailTaken = await this.usersRepository.findOne({
      where: { email: adminEmail, role: Not(UserRole.PATIENT) },
      withDeleted: true,
    });

    if (emailTaken) {
      throw new ConflictException(`Email "${admin.email}" is already in use`);
    }

    const passwordHash = await bcryptHash(admin.password, BCRYPT_ROUNDS);

    const clinicId = await this.dataSource.transaction(async (manager) => {
      const clinic = await manager.save(
        manager.create(ClinicEntity, { ...clinicFields, slug }),
      );

      await manager.save(
        manager.create(UserEntity, {
          clinicId: clinic.id,
          email: adminEmail,
          passwordHash,
          firstName: admin.firstName.trim(),
          lastName: admin.lastName.trim(),
          phone: admin.phone?.trim() ?? null,
          role: UserRole.OWNER,
          isActive: true,
          mfaEnabled: false,
        }),
      );

      return clinic.id;
    });

    return this.findOne(clinicId);
  }

  async update(id: string, dto: UpdateClinicAdminDto): Promise<ClinicAdminDetail> {
    const clinic = await this.findClinicOrFail(id);

    if (dto.slug && dto.slug.toLowerCase() !== clinic.slug) {
      const slugTaken = await this.clinicsRepository.count({
        where: { slug: dto.slug.toLowerCase() },
        withDeleted: true,
      });

      if (slugTaken > 0) {
        throw new ConflictException(`Slug "${dto.slug}" is already taken`);
      }
    }

    // Only apply provided fields — a blind Object.assign would wipe untouched
    // columns since every optional DTO field is `undefined` when absent.
    const definedFields = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    Object.assign(clinic, definedFields);
    if (dto.slug) {
      clinic.slug = dto.slug.toLowerCase();
    }

    await this.clinicsRepository.save(clinic);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.findClinicOrFail(id);
    await this.clinicsRepository.softDelete(id);
  }

  private buildListWhere(
    query: ListClinicsAdminQueryDto,
  ): FindOptionsWhere<ClinicEntity> | FindOptionsWhere<ClinicEntity>[] {
    const { search, isActive } = query;
    const base: FindOptionsWhere<ClinicEntity> =
      typeof isActive === 'boolean' ? { isActive } : {};

    if (!search) {
      return base;
    }

    // OR across name/slug, each branch still ANDed with the isActive filter.
    return [
      { ...base, name: ILike(`%${search}%`) },
      { ...base, slug: ILike(`%${search}%`) },
    ];
  }

  private async findClinicOrFail(id: string): Promise<ClinicEntity> {
    const clinic = await this.clinicsRepository.findOne({ where: { id } });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    return clinic;
  }

  private async countByClinicIds(
    clinicIds: string[],
  ): Promise<{ doctors: Map<string, number>; patients: Map<string, number> }> {
    if (clinicIds.length === 0) {
      return { doctors: new Map(), patients: new Map() };
    }

    const doctorRows = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.clinicId', 'clinicId')
      .addSelect('COUNT(*)', 'count')
      .where('user.clinicId IN (:...clinicIds)', { clinicIds })
      .andWhere('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('user.isActive = true')
      .groupBy('user.clinicId')
      .getRawMany<{ clinicId: string; count: string }>();

    const patientRows = await this.patientsRepository
      .createQueryBuilder('patient')
      .select('patient.clinicId', 'clinicId')
      .addSelect('COUNT(*)', 'count')
      .where('patient.clinicId IN (:...clinicIds)', { clinicIds })
      .groupBy('patient.clinicId')
      .getRawMany<{ clinicId: string; count: string }>();

    return {
      doctors: new Map(doctorRows.map((row) => [row.clinicId, Number(row.count)])),
      patients: new Map(patientRows.map((row) => [row.clinicId, Number(row.count)])),
    };
  }

  private toSummary(
    clinic: ClinicEntity,
    counts: { doctors: Map<string, number>; patients: Map<string, number> },
  ): ClinicAdminSummary {
    return {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      address: clinic.address,
      phone: clinic.phone,
      email: clinic.email,
      timezone: clinic.timezone,
      currency: clinic.currency,
      language: clinic.language,
      isActive: clinic.isActive,
      doctorsCount: counts.doctors.get(clinic.id) ?? 0,
      patientsCount: counts.patients.get(clinic.id) ?? 0,
      createdAt: clinic.createdAt,
    };
  }
}
