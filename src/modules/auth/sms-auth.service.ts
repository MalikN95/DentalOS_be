import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import { magicLinkLoginCopy } from '../../common/notifications/notification-copy';
import { resolveNotificationLocale } from '../../common/notifications/notification-locale';
import { OtpCodeEntity, OtpPurpose } from '../../entities/otp-code.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { UserEntity } from '../../entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { TokensDto } from './dto/tokens.dto';

const LINK_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

@Injectable()
export class SmsAuthService {
  constructor(
    @InjectRepository(OtpCodeEntity)
    private readonly otpRepository: Repository<OtpCodeEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  // Dev/QA convenience only: never true once WhatsApp is actually configured,
  // and never true in production regardless — see OtpCodeEntity#devPlainCode.
  private shouldExposeDevPlainCode(): boolean {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      return false;
    }

    const hasWhatsAppCredentials = Boolean(
      this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') &&
      this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID'),
    );

    return !hasWhatsAppCredentials;
  }

  async requestLoginLink(clinic: ClinicEntity, phone: string): Promise<void> {
    const recentLink = await this.otpRepository.findOne({
      where: {
        clinicId: clinic.id,
        destination: phone,
        purpose: OtpPurpose.SMS_LOGIN,
        createdAt: MoreThan(new Date(Date.now() - RESEND_COOLDOWN_MS)),
      },
    });

    if (recentLink) {
      throw new BadRequestException('Too many requests');
    }

    // Only one live link per phone: invalidate previous ones
    await this.otpRepository.update(
      {
        clinicId: clinic.id,
        destination: phone,
        purpose: OtpPurpose.SMS_LOGIN,
        isUsed: false,
      },
      { isUsed: true },
    );

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const link = this.buildLoginLink(clinic.slug, token);

    await this.otpRepository.save(
      this.otpRepository.create({
        clinicId: clinic.id,
        destination: phone,
        purpose: OtpPurpose.SMS_LOGIN,
        codeHash: tokenHash,
        expiresAt: new Date(Date.now() + LINK_TTL_MS),
        // The full clickable link, not just the token — more useful for the
        // staff kabinet's dev/QA row (PatientInfoPanel#DevLoginCodeRow).
        devPlainCode: this.shouldExposeDevPlainCode() ? link : null,
      }),
    );

    const locale = resolveNotificationLocale(clinic.language);
    const copy = magicLinkLoginCopy(locale, { link });

    await this.notificationsService.send(NotificationChannel.WHATSAPP, {
      to: phone,
      body: copy.body,
    });
  }

  async verifyLoginLink(token: string): Promise<TokensDto> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const otp = await this.otpRepository
      .createQueryBuilder('otp')
      .addSelect('otp.codeHash')
      .where('otp.codeHash = :tokenHash', { tokenHash })
      .andWhere('otp.purpose = :purpose', { purpose: OtpPurpose.SMS_LOGIN })
      .andWhere('otp.isUsed = false')
      .andWhere('otp.expiresAt > NOW()')
      .getOne();

    if (!otp) {
      throw new UnauthorizedException('Link is invalid or expired');
    }

    await this.otpRepository.update({ id: otp.id }, { isUsed: true });

    const user = await this.resolveUser(otp.clinicId, otp.destination);

    return this.authService.issueTokens({
      sub: user.id,
      clinicId: user.clinicId,
      role: user.role,
    });
  }

  private buildLoginLink(clinicSlug: string, token: string): string {
    const portalOrigin = this.configService.getOrThrow<string>('CORS_ORIGIN');
    return `${portalOrigin}/portal/${clinicSlug}/magic?token=${token}`;
  }

  private async resolveUser(
    clinicId: string,
    phone: string,
  ): Promise<UserEntity> {
    const existingUser = await this.usersService.findByPhone(clinicId, phone);

    if (existingUser) {
      return existingUser;
    }

    const user = await this.usersService.createUser({
      clinicId,
      email: `${phone}@sms.local`,
      phone,
      firstName: 'Patient',
      lastName: phone,
      role: UserRole.PATIENT,
      passwordHash: null,
    });

    await this.linkPatient(clinicId, phone, user.id);

    return user;
  }

  private async linkPatient(
    clinicId: string,
    phone: string,
    userId: string,
  ): Promise<void> {
    const patient = await this.patientsRepository.findOne({
      where: { clinicId, phone, isActive: true },
    });

    if (patient) {
      if (!patient.userId) {
        await this.patientsRepository.update({ id: patient.id }, { userId });
      }
      return;
    }

    await this.patientsRepository.save(
      this.patientsRepository.create({
        clinicId,
        userId,
        firstName: 'Patient',
        lastName: phone,
        phone,
      }),
    );
  }
}
