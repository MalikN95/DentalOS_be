import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { createElement } from 'react';
import { render } from '@react-email/render';
import {
  PatientEmailTemplate,
  PatientEmailTemplateProps,
} from './templates/patient-email.template';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface PatientEmailMessage extends PatientEmailTemplateProps {
  to: string;
}

@Injectable()
export class MailService implements OnModuleDestroy {
  private readonly transporter: Transporter;

  private readonly fromEmail: string;

  private readonly fromName: string;

  constructor(config: ConfigService) {
    this.fromEmail = config.getOrThrow<string>('SMTP_FROM_EMAIL');
    this.fromName = config.getOrThrow<string>('SMTP_FROM_NAME');

    this.transporter = createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port: config.getOrThrow<number>('SMTP_PORT'),
      secure: config.getOrThrow<boolean>('SMTP_SECURE'),
      auth: {
        user: config.getOrThrow<string>('SMTP_USER'),
        pass: config.getOrThrow<string>('SMTP_PASSWORD'),
      },
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }

  // Renders the branded react-email template around the clinic's own text
  // (custom message or resolved template) before handing it to nodemailer.
  async sendPatientEmail(message: PatientEmailMessage): Promise<void> {
    const element = createElement(PatientEmailTemplate, {
      clinicName: message.clinicName,
      clinicPhone: message.clinicPhone,
      clinicAddress: message.clinicAddress,
      subject: message.subject,
      bodyText: message.bodyText,
    });

    const [html, text] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);

    await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: message.to,
      subject: message.subject,
      text,
      html,
    });
  }

  onModuleDestroy(): void {
    this.transporter.close();
  }
}
