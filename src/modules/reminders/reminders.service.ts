import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ReminderSettingEntity } from '../../entities/reminder-setting.entity';
import { ReminderEntity, ReminderStatus } from '../../entities/reminder.entity';
import { ListRemindersQueryDto } from './dto/list-reminders-query.dto';
import { ReminderSettingItemDto } from './dto/reminder-setting-item.dto';
import { PaginatedResult } from './types/paginated-result.type';

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(ReminderSettingEntity)
    private readonly settingsRepository: Repository<ReminderSettingEntity>,
    @InjectRepository(ReminderEntity)
    private readonly remindersRepository: Repository<ReminderEntity>,
  ) {}

  getSettings(clinicId: string): Promise<ReminderSettingEntity[]> {
    return this.settingsRepository.find({
      where: { clinicId },
      order: { channel: 'ASC', offsetMinutes: 'ASC' },
    });
  }

  async replaceSettings(
    clinicId: string,
    items: ReminderSettingItemDto[],
  ): Promise<ReminderSettingEntity[]> {
    const keys = items.map((item) => `${item.channel}:${item.offsetMinutes}`);

    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException(
        'Duplicate channel + offsetMinutes combinations are not allowed',
      );
    }

    await this.settingsRepository.manager.transaction(async (manager) => {
      await manager.delete(ReminderSettingEntity, { clinicId });

      if (items.length > 0) {
        const entities = manager.create(
          ReminderSettingEntity,
          items.map((item) => ({ ...item, clinicId })),
        );
        await manager.save(entities);
      }
    });

    return this.getSettings(clinicId);
  }

  async findAll(
    clinicId: string,
    query: ListRemindersQueryDto,
  ): Promise<PaginatedResult<ReminderEntity>> {
    const { page, limit, status, from, to } = query;

    const where: FindOptionsWhere<ReminderEntity> = {
      appointment: { clinicId },
    };

    if (status !== undefined) {
      where.status = status;
    }

    if (from !== undefined && to !== undefined) {
      where.scheduledAt = Between(from, to);
    } else if (from !== undefined) {
      where.scheduledAt = MoreThanOrEqual(from);
    } else if (to !== undefined) {
      where.scheduledAt = LessThanOrEqual(to);
    }

    const [items, total] = await this.remindersRepository.findAndCount({
      where,
      relations: { appointment: { patient: true } },
      order: { scheduledAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async cancel(clinicId: string, id: string): Promise<ReminderEntity> {
    const reminder = await this.remindersRepository.findOne({
      where: { id, appointment: { clinicId } },
      relations: { appointment: { patient: true } },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    if (reminder.status !== ReminderStatus.PENDING) {
      throw new BadRequestException('Only pending reminders can be cancelled');
    }

    reminder.status = ReminderStatus.CANCELLED;
    return this.remindersRepository.save(reminder);
  }
}
