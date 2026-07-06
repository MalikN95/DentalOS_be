import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { BranchEntity } from '../../entities/branch.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { UserEntity } from '../../entities/user.entity';
import { StorageService } from '../storage/storage.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

export type DoctorProfileResponse = DoctorProfileEntity & {
  photoUrl: string | null;
};

export interface PaginatedDoctors {
  items: DoctorProfileResponse[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(DoctorProfileEntity)
    private readonly doctorsRepository: Repository<DoctorProfileEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchesRepository: Repository<BranchEntity>,
    @InjectRepository(ServiceEntity)
    private readonly servicesRepository: Repository<ServiceEntity>,
    private readonly storageService: StorageService,
  ) {}

  async findAll(
    clinicId: string,
    query: ListDoctorsQueryDto,
  ): Promise<PaginatedDoctors> {
    const { branchId, serviceId, search, page, limit } = query;

    const qb = this.doctorsRepository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user')
      .leftJoinAndSelect('doctor.branch', 'branch')
      .where('doctor.clinicId = :clinicId', { clinicId });

    if (branchId) {
      qb.andWhere('doctor.branchId = :branchId', { branchId });
    }

    if (serviceId) {
      qb.innerJoin('doctor.services', 'service', 'service.id = :serviceId', {
        serviceId,
      });
    }

    if (search) {
      qb.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [entities, total] = await qb
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const items = await Promise.all(
      entities.map((entity) => this.withPhotoUrl(entity)),
    );

    return { items, total, page, limit };
  }

  async findOne(clinicId: string, id: string): Promise<DoctorProfileResponse> {
    const doctor = await this.doctorsRepository.findOne({
      where: { id, clinicId },
      relations: { user: true, branch: true, services: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    return this.withPhotoUrl(doctor);
  }

  async create(
    clinicId: string,
    dto: CreateDoctorDto,
  ): Promise<DoctorProfileResponse> {
    const user = await this.usersRepository.findOne({
      where: { id: dto.userId, clinicId },
    });

    if (!user) {
      throw new NotFoundException('User not found in this clinic');
    }

    if (user.role !== UserRole.DOCTOR) {
      throw new BadRequestException('User does not have the DOCTOR role');
    }

    const existing = await this.doctorsRepository.findOne({
      where: { userId: dto.userId },
    });

    if (existing) {
      throw new ConflictException(
        'Doctor profile already exists for this user',
      );
    }

    const doctor = this.doctorsRepository.create({
      clinicId,
      userId: dto.userId,
      branchId: dto.branchId
        ? (await this.getOwnedBranch(clinicId, dto.branchId)).id
        : null,
      description: dto.description ?? null,
      experienceYears: dto.experienceYears ?? 0,
      education: dto.education ?? [],
      specializations: dto.specializations ?? [],
      services: dto.serviceIds
        ? await this.getOwnedServices(clinicId, dto.serviceIds)
        : [],
    });

    const saved = await this.doctorsRepository.save(doctor);

    return this.findOne(clinicId, saved.id);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateDoctorDto,
  ): Promise<DoctorProfileResponse> {
    const doctor = await this.doctorsRepository.findOne({
      where: { id, clinicId },
      relations: { services: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    if (dto.branchId !== undefined) {
      doctor.branchId = (await this.getOwnedBranch(clinicId, dto.branchId)).id;
    }

    if (dto.description !== undefined) {
      doctor.description = dto.description;
    }

    if (dto.experienceYears !== undefined) {
      doctor.experienceYears = dto.experienceYears;
    }

    if (dto.education !== undefined) {
      doctor.education = dto.education;
    }

    if (dto.specializations !== undefined) {
      doctor.specializations = dto.specializations;
    }

    if (dto.photoKey !== undefined) {
      doctor.photoKey = dto.photoKey;
    }

    if (dto.isActive !== undefined) {
      doctor.isActive = dto.isActive;
    }

    if (dto.serviceIds !== undefined) {
      doctor.services = await this.getOwnedServices(clinicId, dto.serviceIds);
    }

    await this.doctorsRepository.save(doctor);

    return this.findOne(clinicId, id);
  }

  async createPhotoUpload(
    clinicId: string,
    id: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; key: string }> {
    const doctor = await this.doctorsRepository.findOne({
      where: { id, clinicId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const key = `doctors/${clinicId}/${doctor.id}/photo`;
    const uploadUrl = await this.storageService.getUploadUrl(key, contentType);

    return { uploadUrl, key };
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const doctor = await this.doctorsRepository.findOne({
      where: { id, clinicId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    await this.doctorsRepository.softRemove(doctor);
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

  private async withPhotoUrl(
    doctor: DoctorProfileEntity,
  ): Promise<DoctorProfileResponse> {
    const photoUrl = doctor.photoKey
      ? await this.storageService.getDownloadUrl(doctor.photoKey)
      : null;

    return { ...doctor, photoUrl };
  }
}
