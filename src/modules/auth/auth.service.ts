import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { compare as bcryptCompare } from 'bcrypt';
import {
  JwtPayload,
  JwtRefreshPayload,
} from '../../common/types/jwt-payload.type';
import { UsersService } from '../users/users.service';
import { TokensDto } from './dto/tokens.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(
    clinicId: string,
    email: string,
    password: string,
  ): Promise<TokensDto> {
    const user = await this.usersService.findByEmailWithPassword(
      clinicId,
      email,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcryptCompare(password, user.passwordHash);

    if (passwordValid === false) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens({
      sub: user.id,
      clinicId: user.clinicId,
      role: user.role,
    });
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

  private async issueTokens(payload: JwtPayload): Promise<TokensDto> {
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
