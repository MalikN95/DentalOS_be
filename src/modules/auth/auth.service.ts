import { randomInt, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare as bcryptCompare, hash as bcryptHash } from 'bcrypt';
import { MoreThan, Repository } from 'typeorm';
import { NotificationChannel } from '../../common/enums/notification-channel.enum';
import { emailChangeOtpCopy } from '../../common/notifications/notification-copy';
import { resolveClinicNotificationContext } from '../../common/notifications/notification-locale';
import { ClinicEntity } from '../../entities/clinic.entity';
import { OtpCodeEntity, OtpPurpose } from '../../entities/otp-code.entity';
import { UserEntity } from '../../entities/user.entity';
import {
  JwtPayload,
  JwtRefreshPayload,
} from '../../common/types/jwt-payload.type';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { AvatarUploadResponseDto } from './dto/avatar-upload-response.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RequestEmailChangeDto } from './dto/request-email-change.dto';
import { TokensDto } from './dto/tokens.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MfaPendingPayload } from './types/auth-token-payload.type';

const MFA_TOKEN_TTL = '5m';
const EMAIL_CHANGE_CODE_TTL_MS = 5 * 60 * 1000;
const EMAIL_CHANGE_RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_CHANGE_MAX_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

export type MeResponse = Pick<
  UserEntity,
  'id' | 'clinicId' | 'email' | 'firstName' | 'lastName' | 'role'
> & { avatarUrl: string | null };

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly storageService: StorageService,
    private readonly notificationsService: NotificationsService,
    @InjectRepository(OtpCodeEntity)
    private readonly otpRepository: Repository<OtpCodeEntity>,
    @InjectRepository(ClinicEntity)
    private readonly clinicsRepository: Repository<ClinicEntity>,
  ) {}

  async login(email: string, password: string): Promise<LoginResponseDto> {
    const user = await this.usersService.findStaffByEmailWithPassword(email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcryptCompare(password, user.passwordHash);

    if (passwordValid === false) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      clinicId: user.clinicId,
      role: user.role,
    };

    if (user.mfaEnabled) {
      return this.buildMfaChallenge(payload);
    }

    return this.issueTokens(payload);
  }

  async refresh(refreshToken: string): Promise<TokensDto> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const storedJti = await this.usersService.findRefreshJti(payload.sub);

    // Rotation: a refresh token is single-use, reuse means the token was stolen
    if (!storedJti || storedJti !== payload.jti) {
      await this.usersService.updateRefreshJti(payload.sub, null);
      throw new UnauthorizedException(
        'Refresh token is invalid or already used',
      );
    }

    return this.issueTokens({
      sub: payload.sub,
      clinicId: payload.clinicId,
      role: payload.role,
    });
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshJti(userId, null);
  }

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.withAvatarUrl(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<MeResponse> {
    const updated = await this.usersService.updateProfile(userId, dto);
    return this.withAvatarUrl(updated);
  }

  // Step 1: mail a 4-digit code to the NEW address — proves the caller
  // actually controls it before anything in the DB changes.
  async requestEmailChange(
    userId: string,
    clinicId: string | null,
    dto: RequestEmailChangeDto,
  ): Promise<void> {
    if (!clinicId) {
      // super_admin has no clinicId — OtpCodeEntity.clinicId is required, and
      // there's no clinic to brand the email with anyway.
      throw new BadRequestException(
        'Email change is not supported for this account',
      );
    }

    const newEmail = dto.newEmail.trim().toLowerCase();
    const isTaken = await this.usersService.isEmailTakenByAnotherUser(
      userId,
      newEmail,
    );

    if (isTaken) {
      throw new ConflictException('This email is already in use');
    }

    const recentCode = await this.otpRepository.findOne({
      where: {
        clinicId,
        destination: newEmail,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        createdAt: MoreThan(
          new Date(Date.now() - EMAIL_CHANGE_RESEND_COOLDOWN_MS),
        ),
      },
    });

    if (recentCode) {
      throw new BadRequestException('Too many requests');
    }

    // Only one live code per destination: invalidate any previous one.
    await this.otpRepository.update(
      {
        clinicId,
        destination: newEmail,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        isUsed: false,
      },
      { isUsed: true },
    );

    const code = randomInt(0, 10_000).toString().padStart(4, '0');
    const codeHash = await bcryptHash(code, BCRYPT_ROUNDS);

    await this.otpRepository.save(
      this.otpRepository.create({
        clinicId,
        destination: newEmail,
        purpose: OtpPurpose.EMAIL_VERIFICATION,
        codeHash,
        expiresAt: new Date(Date.now() + EMAIL_CHANGE_CODE_TTL_MS),
      }),
    );

    const { locale, clinicName } = await resolveClinicNotificationContext(
      this.clinicsRepository,
      clinicId,
    );
    const copy = emailChangeOtpCopy(locale, { code });

    await this.notificationsService.send(NotificationChannel.EMAIL, {
      to: newEmail,
      subject: copy.subject,
      body: copy.body,
      clinicName,
    });
  }

  // Step 2: the code only proves ownership of `newEmail` — re-check it's
  // still free (someone else could have claimed it in the last 5 minutes)
  // before actually applying the change.
  async confirmEmailChange(
    userId: string,
    clinicId: string | null,
    dto: ConfirmEmailChangeDto,
  ): Promise<MeResponse> {
    if (!clinicId) {
      throw new BadRequestException(
        'Email change is not supported for this account',
      );
    }

    const newEmail = dto.newEmail.trim().toLowerCase();

    const otp = await this.otpRepository
      .createQueryBuilder('otp')
      .addSelect('otp.codeHash')
      .where('otp.clinicId = :clinicId', { clinicId })
      .andWhere('otp.destination = :newEmail', { newEmail })
      .andWhere('otp.purpose = :purpose', {
        purpose: OtpPurpose.EMAIL_VERIFICATION,
      })
      .andWhere('otp.isUsed = false')
      .andWhere('otp.attempts < :maxAttempts', {
        maxAttempts: EMAIL_CHANGE_MAX_ATTEMPTS,
      })
      .andWhere('otp.expiresAt > NOW()')
      .orderBy('otp.createdAt', 'DESC')
      .getOne();

    if (!otp) {
      throw new UnauthorizedException('Code is invalid or expired');
    }

    const codeValid = await bcryptCompare(dto.code, otp.codeHash);

    if (codeValid === false) {
      await this.otpRepository.increment({ id: otp.id }, 'attempts', 1);
      throw new UnauthorizedException('Code is invalid or expired');
    }

    const isTaken = await this.usersService.isEmailTakenByAnotherUser(
      userId,
      newEmail,
    );

    if (isTaken) {
      throw new ConflictException('This email is already in use');
    }

    await this.otpRepository.update({ id: otp.id }, { isUsed: true });

    const updated = await this.usersService.updateProfile(userId, {
      email: newEmail,
    });

    return this.withAvatarUrl(updated);
  }

  async getAvatarUploadUrl(
    userId: string,
    contentType: string,
  ): Promise<AvatarUploadResponseDto> {
    const key = `users/${userId}/avatar`;
    const uploadUrl = await this.storageService.getUploadUrl(key, contentType);

    return { uploadUrl, key };
  }

  private async withAvatarUrl(user: UserEntity): Promise<MeResponse> {
    const avatarUrl = user.avatarKey
      ? await this.storageService.getDownloadUrl(user.avatarKey)
      : null;

    return {
      id: user.id,
      clinicId: user.clinicId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl,
    };
  }

  // Second step (MFA / SMS / social) also ends here, hence public
  async issueTokens(payload: JwtPayload): Promise<TokensDto> {
    const jti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...payload },
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.config.getOrThrow<string>(
            'JWT_ACCESS_TTL',
          ) as JwtSignOptions['expiresIn'],
        },
      ),
      this.jwtService.signAsync(
        { ...payload, jti } satisfies JwtRefreshPayload,
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.config.getOrThrow<string>(
            'JWT_REFRESH_TTL',
          ) as JwtSignOptions['expiresIn'],
        },
      ),
    ]);

    await this.usersService.updateRefreshJti(payload.sub, jti);

    return { accessToken, refreshToken };
  }

  // mfa: 'pending' tokens are rejected by the access strategy — they only
  // work at POST /auth/mfa/verify
  async buildMfaChallenge(payload: JwtPayload): Promise<LoginResponseDto> {
    const mfaToken = await this.jwtService.signAsync(
      { ...payload, mfa: 'pending' } satisfies MfaPendingPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: MFA_TOKEN_TTL,
      },
    );

    return { mfaRequired: true, mfaToken };
  }

  private async verifyRefreshToken(token: string): Promise<JwtRefreshPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtRefreshPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token expired or malformed');
    }
  }
}
