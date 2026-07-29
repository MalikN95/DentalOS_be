import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientTagEntity } from '../../entities/patient-tag.entity';
import { CreatePatientTagDto } from './dto/create-patient-tag.dto';
import { UpdatePatientTagDto } from './dto/update-patient-tag.dto';

// Seeded once per clinic the first time its tag list is requested — from
// then on they're plain clinic-scoped rows, freely renamed/recolored/deleted.
const DEFAULT_TAG_NAMES = [
  'VIP',
  'Должник',
  'Аллергия',
  'Требует напоминания',
  'Постоянный пациент',
  'Новый пациент',
];

@Injectable()
export class PatientTagsService {
  constructor(
    @InjectRepository(PatientTagEntity)
    private readonly tagsRepository: Repository<PatientTagEntity>,
  ) {}

  async list(clinicId: string): Promise<PatientTagEntity[]> {
    const existing = await this.tagsRepository.find({
      where: { clinicId },
      order: { createdAt: 'ASC' },
    });

    if (existing.length > 0) {
      return existing;
    }

    const seeded = this.tagsRepository.create(
      DEFAULT_TAG_NAMES.map((name) => ({ clinicId, name, color: null })),
    );

    return this.tagsRepository.save(seeded);
  }

  async getById(clinicId: string, id: string): Promise<PatientTagEntity> {
    const tag = await this.tagsRepository.findOne({ where: { id, clinicId } });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  create(
    clinicId: string,
    dto: CreatePatientTagDto,
  ): Promise<PatientTagEntity> {
    const tag = this.tagsRepository.create({
      ...dto,
      clinicId,
      color: dto.color ?? null,
    });

    return this.tagsRepository.save(tag);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdatePatientTagDto,
  ): Promise<PatientTagEntity> {
    const tag = await this.getById(clinicId, id);
    Object.assign(tag, dto);
    return this.tagsRepository.save(tag);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const tag = await this.getById(clinicId, id);
    await this.tagsRepository.softRemove(tag);
  }
}
