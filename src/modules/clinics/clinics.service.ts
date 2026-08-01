import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicEntity } from '../../entities/clinic.entity';
import { StorageService } from '../storage/storage.service';
import { LogoUploadResponseDto } from './dto/logo-upload-response.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

export type ClinicResponse = ClinicEntity & { logoUrl: string | null };

@Injectable()
export class ClinicsService {
  constructor(
    @InjectRepository(ClinicEntity)
    private readonly clinicsRepository: Repository<ClinicEntity>,
    private readonly storageService: StorageService,
  ) {}

  findBySlug(slug: string): Promise<ClinicEntity | null> {
    return this.clinicsRepository.findOne({
      where: { slug: slug.toLowerCase(), isActive: true },
    });
  }

  findById(id: string): Promise<ClinicEntity | null> {
    return this.clinicsRepository.findOne({ where: { id, isActive: true } });
  }

  getCurrent(clinic: ClinicEntity): Promise<ClinicResponse> {
    return this.withLogoUrl(clinic);
  }

  async update(
    clinicId: string,
    dto: UpdateClinicDto,
  ): Promise<ClinicResponse> {
    const clinic = await this.clinicsRepository.findOne({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found');
    }

    // Only apply provided fields. With `useDefineForClassFields`, the DTO
    // instance carries every optional field as `undefined`, so a blind
    // Object.assign would wipe untouched columns (e.g. logoKey, name).
    const definedFields = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    Object.assign(clinic, definedFields);
    const saved = await this.clinicsRepository.save(clinic);

    return this.withLogoUrl(saved);
  }

  async getLogoUploadUrl(
    clinicId: string,
    contentType: string,
  ): Promise<LogoUploadResponseDto> {
    const key = `clinics/${clinicId}/logo`;
    const uploadUrl = await this.storageService.getUploadUrl(key, contentType);

    return { uploadUrl, key };
  }

  private async withLogoUrl(clinic: ClinicEntity): Promise<ClinicResponse> {
    const logoUrl = clinic.logoKey
      ? await this.storageService.getDownloadUrl(clinic.logoKey)
      : null;

    return { ...clinic, logoUrl };
  }
}
