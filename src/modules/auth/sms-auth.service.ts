import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare as bcryptCompare, hash as bcryptHash } from 'bcrypt';
import { MoreThan, Repository } from 'typeorm';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { OtpCodeEntity, OtpPurpose } from '../../entities/otp-code.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { UserEntity } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { TokensDto } from './dto/tokens.dto';

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

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
  ) {}

  async requestCode(clinicId: string, phone: string): Promise<void> {
    const recentCode = await this.otpRepository.findOne({
      where: {
        clinicId,
        destination: phone,
        purpose: OtpPurpose.SMS_LOGIN,
        createdAt: MoreThan(new Date(Date.now() - RESEND_COOLDOWN_MS)),
      },
    });

    if (recentCode) {
      throw new BadRequestException('Too many requests');
    }

    // Only one live code per phone: invalidate previous ones
    await this.otpRepository.update(
      {
        clinicId,
        destination: phone,
        purpose: OtpPurpose.SMS_LOGIN,
        isUsed: false,
      },
      { isUsed: true },
    );

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await bcryptHash(code, BCRYPT_ROUNDS);

    await this.otpRepository.save(
      this.otpRepository.create({
        clinicId,
        destination: phone,
        purpose: OtpPurpose.SMS_LOGIN,
        codeHash,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      }),
    );

    await this.notificationsService.send(NotificationChannel.SMS, {
      to: phone,
      body: `Код входа: ${code}`,
    });
  }

  async verifyCode(
    clinicId: string,
    phone: string,
    code: string,
  ): Promise<TokensDto> {
    const otp = await this.otpRepository
      .createQueryBuilder('otp')
      .addSelect('otp.codeHash')
      .where('otp.clinicId = :clinicId', { clinicId })
      .andWhere('otp.destination = :phone', { phone })
      .andWhere('otp.purpose = :purpose', { purpose: OtpPurpose.SMS_LOGIN })
      .andWhere('otp.isUsed = false')
      .andWhere('otp.attempts < :maxAttempts', { maxAttempts: MAX_ATTEMPTS })
      .andWhere('otp.expiresAt > NOW()')
      .orderBy('otp.createdAt', 'DESC')
      .getOne();

    if (!otp) {
      throw new UnauthorizedException('Code is invalid or expired');
    }

    const codeValid = await bcryptCompare(code, otp.codeHash);

    if (codeValid === false) {
      await this.otpRepository.increment({ id: otp.id }, 'attempts', 1);
      throw new UnauthorizedException('Code is invalid or expired');
    }

    await this.otpRepository.update({ id: otp.id }, { isUsed: true });

    const user = await this.resolveUser(clinicId, phone);

    return this.authService.issueTokens({
      sub: user.id,
      clinicId: user.clinicId,
      role: user.role,
    });
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
