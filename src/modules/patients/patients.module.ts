import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { MedicalRecordEntity } from '../../entities/medical-record.entity';
import { PatientFileEntity } from '../../entities/patient-file.entity';
import { PatientTagEntity } from '../../entities/patient-tag.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { PatientFilesService } from './patient-files.service';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientEntity,
      PatientFileEntity,
      PatientTagEntity,
      AppointmentEntity,
      MedicalRecordEntity,
    ]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService, PatientFilesService],
  exports: [PatientsService],
})
export class PatientsModule {}
