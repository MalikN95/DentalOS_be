import { randomUUID } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { compare as bcryptCompare } from 'bcrypt';
import { UserEntity } from '../../entities/user.entity';
import {
  JwtPayload,
  JwtRefreshPayload,
} from '../../common/types/jwt-payload.type';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { AvatarUploadResponseDto } from './dto/avatar-upload-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { TokensDto } from './dto/tokens.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MfaPendingPayload } from './types/auth-token-payload.type';

const MFA_TOKEN_TTL = '5m';

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
