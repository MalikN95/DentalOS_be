import { Module } from '@nestjs/common';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { MailModule } from '../mail/mail.module';
import { PatientsModule } from '../patients/patients.module';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';

@Module({
  imports: [PatientsModule, EmailTemplatesModule, MailModule],
  controllers: [EmailsController],
  providers: [EmailsService],
})
export class EmailsModule {}
