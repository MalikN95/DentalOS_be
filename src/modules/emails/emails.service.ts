import { BadRequestException, Injectable } from '@nestjs/common';
import {
  renderTemplate,
  TemplateData,
} from '../../common/helpers/render-template.helper';
import { ClinicEntity } from '../../entities/clinic.entity';
import { PatientMessageChannel } from '../../entities/patient-message.entity';
import { ChatService } from '../chat/chat.service';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import { MailService } from '../mail/mail.service';
import { PatientsService } from '../patients/patients.service';
import {
  SendEmailMode,
  SendPatientEmailDto,
} from './dto/send-patient-email.dto';

@Injectable()
export class EmailsService {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly emailTemplatesService: EmailTemplatesService,
    private readonly mailService: MailService,
    private readonly chatService: ChatService,
  ) {}

  async sendToPatient(
    clinic: ClinicEntity,
    patientId: string,
    dto: SendPatientEmailDto,
    sentByUserId: string,
  ): Promise<void> {
    const patient = await this.patientsService.findOne(clinic.id, patientId);

    if (!patient.email) {
      throw new BadRequestException('Patient has no email on file');
    }

    const placeholders: TemplateData = {
      patientFirstName: patient.firstName,
      patientLastName: patient.lastName,
      clinicName: clinic.name,
      clinicPhone: clinic.phone ?? '',
      clinicAddress: clinic.address ?? '',
    };

    let subject: string;
    let body: string;

    if (dto.mode === SendEmailMode.TEMPLATE) {
      if (!dto.templateId) {
        throw new BadRequestException(
          'templateId is required for mode = template',
        );
      }

      const template = await this.emailTemplatesService.findOne(
        clinic.id,
        dto.templateId,
      );
      subject = template.subject;
      body = template.body;
    } else {
      if (!dto.subject || !dto.body) {
        throw new BadRequestException(
          'subject and body are required for mode = custom',
        );
      }

      subject = dto.subject;
      body = dto.body;
    }

    const renderedSubject = renderTemplate(subject, placeholders);
    const renderedBody = renderTemplate(body, placeholders);

    await this.mailService.sendPatientEmail({
      to: patient.email,
      clinicName: clinic.name,
      clinicPhone: clinic.phone,
      clinicAddress: clinic.address,
      subject: renderedSubject,
      bodyText: renderedBody,
    });

    await this.chatService.logPatientMessage({
      clinicId: clinic.id,
      patientId: patient.id,
      channel: PatientMessageChannel.EMAIL,
      subject: renderedSubject,
      body: renderedBody,
      sentByUserId,
    });
  }
}
