import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from '../../entities/branch.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { UserEntity } from '../../entities/user.entity';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      DoctorProfileEntity,
      BranchEntity,
      ServiceEntity,
    ]),
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
