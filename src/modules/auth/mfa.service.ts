import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { MfaSetupResponseDto } from './dto/mfa-setup-response.dto';
import { TokensDto } from './dto/tokens.dto';
import { buildOtpauthUrl, generateTotpSecret, verifyTotp } from './totp.util';
import { MfaPendingPayload } from './types/auth-token-payload.type';

@Injectable()
export class MfaService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async setup(userId: string): Promise<MfaSetupResponseDto> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const secret = generateTotpSecret();

    // mfaEnabled stays false until the user confirms a code via /mfa/enable
    await this.usersService.updateMfa(userId, {
      mfaSecret: secret,
      mfaEnabled: false,
    });

    return { secret, otpauthUrl: buildOtpauthUrl(secret, user.email) };
  }

  async enable(userId: string, code: string): Promise<void> {
    await this.assertCode(userId, code);
    await this.usersService.updateMfa(userId, { mfaEnabled: true });
  }

  async disable(userId: string, code: string): Promise<void> {
    await this.assertCode(userId, code);
    await this.usersService.updateMfa(userId, {
      mfaEnabled: false,
      mfaSecret: null,
    });
  }

  async verify(mfaToken: string, code: string): Promise<TokensDto> {
    const payload = await this.verifyMfaToken(mfaToken);

    await this.assertCode(payload.sub, code);

    return this.authService.issueTokens({
      sub: payload.sub,
      clinicId: payload.clinicId,
      role: payload.role,
    });
  }

  private async assertCode(userId: string, code: string): Promise<void> {
    const secret = await this.usersService.findMfaSecret(userId);

    if (!secret) {
      throw new BadRequestException('MFA is not set up');
    }

    if (verifyTotp(secret, code) === false) {
      throw new BadRequestException('Invalid MFA code');
    }
  }

  private async verifyMfaToken(mfaToken: string): Promise<MfaPendingPayload> {
    let payload: MfaPendingPayload;

    try {
      payload = await this.jwtService.verifyAsync<MfaPendingPayload>(mfaToken, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('MFA token expired or malformed');
    }

    if (payload.mfa !== 'pending') {
      throw new UnauthorizedException('Token is not an MFA challenge token');
    }

    return payload;
  }
}
