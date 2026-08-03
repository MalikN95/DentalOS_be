import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { MedicalRecordEntity } from '../../entities/medical-record.entity';
import { OtpCodeEntity } from '../../entities/otp-code.entity';
import { PatientFileEntity } from '../../entities/patient-file.entity';
import { PatientNoteEntity } from '../../entities/patient-note.entity';
import { PatientTagEntity } from '../../entities/patient-tag.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { PatientFilesService } from './patient-files.service';
import { PatientNotesService } from './patient-notes.service';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientEntity,
      PatientFileEntity,
      PatientNoteEntity,
      PatientTagEntity,
      AppointmentEntity,
      MedicalRecordEntity,
      DoctorProfileEntity,
      OtpCodeEntity,
    ]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService, PatientFilesService, PatientNotesService],
  exports: [PatientsService],
})
export class PatientsModule {}
