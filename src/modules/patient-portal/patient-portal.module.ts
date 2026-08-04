import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { UserEntity } from '../../entities/user.entity';
import { AppointmentsModule } from '../appointments/appointments.module';
import { BookingModule } from '../booking/booking.module';
import { ChatModule } from '../chat/chat.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { PatientPortalController } from './patient-portal.controller';
import { PatientPortalService } from './patient-portal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientEntity,
      AppointmentEntity,
      UserEntity,
      ClinicEntity,
    ]),
    AppointmentsModule,
    ChatModule,
    ReviewsModule,
    BookingModule,
  ],
  controllers: [PatientPortalController],
  providers: [PatientPortalService],
})
export class PatientPortalModule {}
