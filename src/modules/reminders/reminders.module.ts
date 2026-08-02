import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicEntity } from '../../entities/clinic.entity';
import { ReminderSettingEntity } from '../../entities/reminder-setting.entity';
import { ReminderEntity } from '../../entities/reminder.entity';
import { ReminderProcessorService } from './reminder-processor.service';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReminderSettingEntity,
      ReminderEntity,
      ClinicEntity,
    ]),
  ],
  controllers: [RemindersController],
  providers: [RemindersService, ReminderProcessorService],
  exports: [RemindersService],
})
export class RemindersModule {}
