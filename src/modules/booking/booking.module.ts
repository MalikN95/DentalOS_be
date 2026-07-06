import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { BranchEntity } from '../../entities/branch.entity';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { DoctorScheduleEntity } from '../../entities/doctor-schedule.entity';
import { EquipmentEntity } from '../../entities/equipment.entity';
import { LeadEntity } from '../../entities/lead.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ReminderSettingEntity } from '../../entities/reminder-setting.entity';
import { ReminderEntity } from '../../entities/reminder.entity';
import { ScheduleExceptionEntity } from '../../entities/schedule-exception.entity';
import { ServiceCategoryEntity } from '../../entities/service-category.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AvailabilityService } from './availability.service';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BranchEntity,
      ServiceEntity,
      ServiceCategoryEntity,
      DoctorProfileEntity,
      DoctorScheduleEntity,
      ScheduleExceptionEntity,
      AppointmentEntity,
      PatientEntity,
      CabinetEntity,
      EquipmentEntity,
      ReminderSettingEntity,
      ReminderEntity,
      LeadEntity,
    ]),
    NotificationsModule,
  ],
  controllers: [BookingController],
  providers: [BookingService, AvailabilityService],
})
export class BookingModule {}
