import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientTagEntity } from '../../entities/patient-tag.entity';
import { PatientTagsController } from './patient-tags.controller';
import { PatientTagsService } from './patient-tags.service';

@Module({
  imports: [TypeOrmModule.forFeature([PatientTagEntity])],
  controllers: [PatientTagsController],
  providers: [PatientTagsService],
  exports: [PatientTagsService],
})
export class PatientTagsModule {}
