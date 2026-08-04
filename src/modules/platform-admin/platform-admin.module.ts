import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicEntity } from '../../entities/clinic.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { PaymentEntity } from '../../entities/payment.entity';
import { UserEntity } from '../../entities/user.entity';
import { ClinicsAdminController } from './clinics-admin.controller';
import { ClinicsAdminService } from './clinics-admin.service';
import { StatsAdminController } from './stats-admin.controller';
import { StatsAdminService } from './stats-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicEntity, UserEntity, PatientEntity, PaymentEntity]),
  ],
  controllers: [ClinicsAdminController, StatsAdminController],
  providers: [ClinicsAdminService, StatsAdminService],
})
export class PlatformAdminModule {}
