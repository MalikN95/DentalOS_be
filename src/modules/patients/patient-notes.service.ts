import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { PatientNoteEntity } from '../../entities/patient-note.entity';
import { CreatePatientNoteDto } from './dto/create-patient-note.dto';
import { PatientsService } from './patients.service';

@Injectable()
export class PatientNotesService {
  constructor(
    @InjectRepository(PatientNoteEntity)
    private readonly notesRepository: Repository<PatientNoteEntity>,
    private readonly patientsService: PatientsService,
  ) {}

  async findAll(
    clinicId: string,
    patientId: string,
    user: JwtPayload,
  ): Promise<PatientNoteEntity[]> {
    // Reuses the patients read-scoping (e.g. a doctor only sees their own
    // patients) instead of duplicating that ownership check here.
    await this.patientsService.findOne(clinicId, patientId, user);

    return this.notesRepository.find({
      where: { patientId },
      relations: { author: true },
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    clinicId: string,
    patientId: string,
    user: JwtPayload,
    dto: CreatePatientNoteDto,
  ): Promise<PatientNoteEntity> {
    await this.patientsService.findOne(clinicId, patientId, user);

    const note = this.notesRepository.create({
      patientId,
      authorUserId: user.sub,
      text: dto.text,
    });

    const saved = await this.notesRepository.save(note);
    const withAuthor = await this.notesRepository.findOne({
      where: { id: saved.id },
      relations: { author: true },
    });

    if (!withAuthor) {
      throw new NotFoundException('Note not found after creation');
    }

    return withAuthor;
  }
}
