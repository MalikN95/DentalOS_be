import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { MedicalRecordEntity } from '../../entities/medical-record.entity';
import { PatientFileEntity } from '../../entities/patient-file.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { StorageService } from '../storage/storage.service';
import { CreatePatientFileDto } from './dto/create-patient-file.dto';
import { ListPatientFilesQueryDto } from './dto/list-patient-files-query.dto';
import {
  FileUploadTargetDto,
  RequestFileUploadDto,
} from './dto/request-file-upload.dto';
import { PaginatedResult, PatientFileWithUrl } from './patients.types';

@Injectable()
export class PatientFilesService {
  constructor(
    @InjectRepository(PatientFileEntity)
    private readonly filesRepository: Repository<PatientFileEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
    @InjectRepository(MedicalRecordEntity)
    private readonly medicalRecordsRepository: Repository<MedicalRecordEntity>,
    private readonly storageService: StorageService,
  ) {}

  async findAll(
    clinicId: string,
    patientId: string,
    query: ListPatientFilesQueryDto,
  ): Promise<PaginatedResult<PatientFileWithUrl>> {
    await this.ensurePatient(clinicId, patientId);

    const { page, limit, type, toothNumber } = query;
    const [files, total] = await this.filesRepository.findAndCount({
      where: {
        patientId,
        ...(type ? { type } : {}),
        ...(toothNumber !== undefined ? { toothNumber } : {}),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items = await Promise.all(
      files.map(async (file): Promise<PatientFileWithUrl> => ({
        ...file,
        downloadUrl: await this.storageService.getDownloadUrl(file.fileKey),
      })),
    );

    return { items, total, page, limit };
  }

  async requestUpload(
    clinicId: string,
    patientId: string,
    dto: RequestFileUploadDto,
  ): Promise<FileUploadTargetDto> {
    await this.ensurePatient(clinicId, patientId);

    const safeName = dto.fileName.replace(/[^\w.-]+/g, '_');
    const key = `patients/${clinicId}/${patientId}/${randomUUID()}-${safeName}`;
    const uploadUrl = await this.storageService.getUploadUrl(
      key,
      dto.contentType,
    );

    return { uploadUrl, key };
  }

  async confirmUpload(
    clinicId: string,
    patientId: string,
    dto: CreatePatientFileDto,
  ): Promise<PatientFileEntity> {
    await this.ensurePatient(clinicId, patientId);

    if (!dto.key.startsWith(`patients/${clinicId}/${patientId}/`)) {
      throw new BadRequestException('File key does not belong to this patient');
    }

    if (dto.medicalRecordId) {
      const record = await this.medicalRecordsRepository.findOne({
        where: { id: dto.medicalRecordId, patientId },
      });

      if (!record) {
        throw new BadRequestException(
          'Medical record does not belong to this patient',
        );
      }
    }

    const file = this.filesRepository.create({
      patientId,
      medicalRecordId: dto.medicalRecordId ?? null,
      type: dto.type,
      documentType: dto.documentType ?? null,
      note: dto.note ?? null,
      toothNumber: dto.toothNumber ?? null,
      fileKey: dto.key,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
    });

    return this.filesRepository.save(file);
  }

  async remove(clinicId: string, fileId: string): Promise<void> {
    const file = await this.filesRepository.findOne({
      where: { id: fileId, patient: { clinicId } },
    });

    if (!file) {
      throw new NotFoundException('Patient file not found');
    }

    await this.filesRepository.softRemove(file);
    await this.storageService.remove(file.fileKey);
  }

  private async ensurePatient(
    clinicId: string,
    patientId: string,
  ): Promise<void> {
    const exists = await this.patientsRepository.exists({
      where: { id: patientId, clinicId },
    });

    if (!exists) {
      throw new NotFoundException('Patient not found');
    }
  }
}
