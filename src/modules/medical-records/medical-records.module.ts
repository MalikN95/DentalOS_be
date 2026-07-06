import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { MedicalRecordEntity } from '../../entities/medical-record.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { TreatmentPlanItemEntity } from '../../entities/treatment-plan-item.entity';
import { TreatmentPlanEntity } from '../../entities/treatment-plan.entity';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { TreatmentPlansController } from './treatment-plans.controller';
import { TreatmentPlansService } from './treatment-plans.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MedicalRecordEntity,
      TreatmentPlanEntity,
      TreatmentPlanItemEntity,
      PatientEntity,
      DoctorProfileEntity,
      ServiceEntity,
    ]),
  ],
  controllers: [MedicalRecordsController, TreatmentPlansController],
  providers: [MedicalRecordsService, TreatmentPlansService],
  exports: [MedicalRecordsService, TreatmentPlansService],
})
export class MedicalRecordsModule {}
