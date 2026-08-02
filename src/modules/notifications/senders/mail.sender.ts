import { NotificationChannel } from '../../../common/enums/notification-channel.enum';
import { textToHtml } from '../../../common/helpers/text-to-html.helper';
import { MailService } from '../../mail/mail.service';
import {
  NotificationMessage,
  NotificationSender,
} from '../notification-sender.interface';

export class MailSender implements NotificationSender {
  readonly channel = NotificationChannel.EMAIL;

  constructor(private readonly mailService: MailService) {}

  send(message: NotificationMessage): Promise<void> {
    return this.mailService.send({
      to: message.to,
      subject: message.subject ?? '',
      text: message.body,
      html: textToHtml(message.body),
      fromName: message.clinicName,
    });
  }
}
