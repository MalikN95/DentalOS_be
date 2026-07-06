import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ToothMarkEntity } from '../../entities/tooth-mark.entity';
import { DentalChartController } from './dental-chart.controller';
import { DentalChartService } from './dental-chart.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ToothMarkEntity,
      PatientEntity,
      DoctorProfileEntity,
    ]),
  ],
  controllers: [DentalChartController],
  providers: [DentalChartService],
  exports: [DentalChartService],
})
export class DentalChartModule {}
