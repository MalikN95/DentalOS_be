import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { ReviewEntity } from '../../entities/review.entity';
import { UserEntity } from '../../entities/user.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReviewEntity,
      AppointmentEntity,
      DoctorProfileEntity,
      UserEntity,
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
