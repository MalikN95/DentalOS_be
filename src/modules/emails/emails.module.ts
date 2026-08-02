import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { MailModule } from '../mail/mail.module';
import { PatientsModule } from '../patients/patients.module';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';

@Module({
  imports: [PatientsModule, EmailTemplatesModule, MailModule, ChatModule],
  controllers: [EmailsController],
  providers: [EmailsService],
})
export class EmailsModule {}
