import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { BranchEntity } from '../../entities/branch.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { DoctorScheduleEntity } from '../../entities/doctor-schedule.entity';
import { ScheduleExceptionEntity } from '../../entities/schedule-exception.entity';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { ListExceptionsQueryDto } from './dto/list-exceptions-query.dto';
import { ScheduleSlotDto } from './dto/schedule-slot.dto';

export interface PaginatedExceptions {
  items: ScheduleExceptionEntity[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(DoctorScheduleEntity)
    private readonly schedulesRepository: Repository<DoctorScheduleEntity>,
    @InjectRepository(ScheduleExceptionEntity)
    private readonly exceptionsRepository: Repository<ScheduleExceptionEntity>,
    @InjectRepository(DoctorProfileEntity)
    private readonly doctorsRepository: Repository<DoctorProfileEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchesRepository: Repository<BranchEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async getWeeklySchedule(
    clinicId: string,
    doctorProfileId: string,
    user: JwtPayload,
  ): Promise<DoctorScheduleEntity[]> {
    await this.getOwnedProfile(clinicId, doctorProfileId, user);

    return this.schedulesRepository.find({
      where: { doctorProfileId },
      relations: { branch: true },
      order: { weekday: 'ASC', startTime: 'ASC' },
    });
  }

  async replaceWeeklySchedule(
    clinicId: string,
    doctorProfileId: string,
    slots: ScheduleSlotDto[],
  ): Promise<DoctorScheduleEntity[]> {
    await this.getOwnedProfile(clinicId, doctorProfileId);

    const seen = new Set<string>();

    slots.forEach((slot) => {
      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException(
          `Slot ${slot.startTime}-${slot.endTime} (weekday ${slot.weekday}): startTime must be earlier than endTime`,
        );
      }

      const key = `${slot.branchId}:${slot.weekday}`;

      if (seen.has(key)) {
        throw new BadRequestException(
          `Duplicate slot for branch ${slot.branchId} on weekday ${slot.weekday}`,
        );
      }

      seen.add(key);
    });

    await this.assertBranchesOwned(clinicId, slots);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(DoctorScheduleEntity, { doctorProfileId });

      if (slots.length > 0) {
        await manager.insert(
          DoctorScheduleEntity,
          slots.map((slot) => ({
            doctorProfileId,
            branchId: slot.branchId,
            weekday: slot.weekday,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        );
      }
    });

    return this.schedulesRepository.find({
      where: { doctorProfileId },
      relations: { branch: true },
      order: { weekday: 'ASC', startTime: 'ASC' },
    });
  }

  async listExceptions(
    clinicId: string,
    doctorProfileId: string,
    query: ListExceptionsQueryDto,
    user: JwtPayload,
  ): Promise<PaginatedExceptions> {
    await this.getOwnedProfile(clinicId, doctorProfileId, user);

    const { from, to, page, limit } = query;

    const qb = this.exceptionsRepository
      .createQueryBuilder('exception')
      .where('exception.doctorProfileId = :doctorProfileId', {
        doctorProfileId,
      });

    if (from) {
      qb.andWhere('exception.dateTo >= :from', { from });
    }

    if (to) {
      qb.andWhere('exception.dateFrom <= :to', { to });
    }

    const [items, total] = await qb
      .orderBy('exception.dateFrom', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async createException(
    clinicId: string,
    doctorProfileId: string,
    dto: CreateScheduleExceptionDto,
    user: JwtPayload,
  ): Promise<ScheduleExceptionEntity> {
    await this.getOwnedProfile(clinicId, doctorProfileId, user);

    if (dto.dateFrom > dto.dateTo) {
      throw new BadRequestException('dateFrom must not be after dateTo');
    }

    const exception = this.exceptionsRepository.create({
      doctorProfileId,
      type: dto.type,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      comment: dto.comment ?? null,
    });

    return this.exceptionsRepository.save(exception);
  }

  async removeException(
    clinicId: string,
    id: string,
    user: JwtPayload,
  ): Promise<void> {
    const exception = await this.exceptionsRepository
      .createQueryBuilder('exception')
      .innerJoinAndSelect('exception.doctorProfile', 'doctorProfile')
      .where('exception.id = :id', { id })
      .andWhere('doctorProfile.clinicId = :clinicId', { clinicId })
      .getOne();

    if (!exception) {
      throw new NotFoundException('Schedule exception not found');
    }

    if (
      user.role === UserRole.DOCTOR &&
      exception.doctorProfile.userId !== user.sub
    ) {
      throw new ForbiddenException(
        'Doctors may only manage their own schedule',
      );
    }

    await this.exceptionsRepository.softRemove(exception);
  }

  private async getOwnedProfile(
    clinicId: string,
    doctorProfileId: string,
    user?: JwtPayload,
  ): Promise<DoctorProfileEntity> {
    const profile = await this.doctorsRepository.findOne({
      where: { id: doctorProfileId, clinicId },
    });

    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }

    if (user && user.role === UserRole.DOCTOR && profile.userId !== user.sub) {
      throw new ForbiddenException('Doctors may only view their own schedule');
    }

    return profile;
  }

  private async assertBranchesOwned(
    clinicId: string,
    slots: ScheduleSlotDto[],
  ): Promise<void> {
    const branchIds = [...new Set(slots.map((slot) => slot.branchId))];

    if (branchIds.length === 0) {
      return;
    }

    const count = await this.branchesRepository.count({
      where: { id: In(branchIds), clinicId },
    });

    if (count !== branchIds.length) {
      throw new BadRequestException(
        'One or more branches do not belong to this clinic',
      );
    }
  }
}
