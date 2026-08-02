import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { BranchEntity } from '../../entities/branch.entity';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { DoctorScheduleEntity } from '../../entities/doctor-schedule.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ReminderEntity } from '../../entities/reminder.entity';
import { ScheduleExceptionEntity } from '../../entities/schedule-exception.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { UserEntity } from '../../entities/user.entity';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppointmentEntity,
      PatientEntity,
      DoctorProfileEntity,
      ServiceEntity,
      BranchEntity,
      CabinetEntity,
      ReminderEntity,
      DoctorScheduleEntity,
      ScheduleExceptionEntity,
      UserEntity,
      ClinicEntity,
    ]),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
