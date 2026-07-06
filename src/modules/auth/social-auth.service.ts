import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  AuthProviderEntity,
  AuthProviderType,
} from '../../entities/auth-provider.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { UserEntity } from '../../entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { IdTokenVerifier } from './id-token.verifier';

interface ProviderConfig {
  clientIdEnvKey: string;
  jwksUri: string;
  issuers: string[];
}

const PROVIDER_CONFIG: Record<AuthProviderType, ProviderConfig> = {
  [AuthProviderType.GOOGLE]: {
    clientIdEnvKey: 'GOOGLE_CLIENT_ID',
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    issuers: ['accounts.google.com', 'https://accounts.google.com'],
  },
  [AuthProviderType.APPLE]: {
    clientIdEnvKey: 'APPLE_CLIENT_ID',
    jwksUri: 'https://appleid.apple.com/auth/keys',
    issuers: ['https://appleid.apple.com'],
  },
};

@Injectable()
export class SocialAuthService {
  constructor(
    @InjectRepository(AuthProviderEntity)
    private readonly providersRepository: Repository<AuthProviderEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly idTokenVerifier: IdTokenVerifier,
    private readonly config: ConfigService,
  ) {}

  async login(
    clinicId: string,
    provider: AuthProviderType,
    idToken: string,
  ): Promise<LoginResponseDto> {
    const providerConfig = PROVIDER_CONFIG[provider];
    const clientId = this.config.get<string>(providerConfig.clientIdEnvKey);

    if (!clientId) {
      throw new BadRequestException('Provider is not configured');
    }

    const { sub, email } = await this.idTokenVerifier.verify(idToken, {
      jwksUri: providerConfig.jwksUri,
      issuers: providerConfig.issuers,
      audience: clientId,
    });

    const user = await this.resolveUser(clinicId, provider, sub, email);

    if (user.mfaEnabled) {
      return this.authService.buildMfaChallenge({
        sub: user.id,
        clinicId: user.clinicId,
        role: user.role,
      });
    }

    return this.authService.issueTokens({
      sub: user.id,
      clinicId: user.clinicId,
      role: user.role,
    });
  }

  private async resolveUser(
    clinicId: string,
    provider: AuthProviderType,
    providerUserId: string,
    email: string | null,
  ): Promise<UserEntity> {
    const link = await this.providersRepository.findOne({
      where: { provider, providerUserId },
    });

    if (link) {
      const user = await this.usersService.findById(link.userId);

      if (!user || user.clinicId !== clinicId) {
        throw new UnauthorizedException('Account is not available');
      }

      return user;
    }

    if (!email) {
      throw new BadRequestException('ID token does not contain an email');
    }

    let user = await this.usersService.findByEmail(clinicId, email);

    if (!user) {
      user = await this.usersService.createUser({
        clinicId,
        email,
        firstName: 'Patient',
        lastName: email,
        role: UserRole.PATIENT,
        passwordHash: null,
      });

      await this.patientsRepository.save(
        this.patientsRepository.create({
          clinicId,
          userId: user.id,
          firstName: 'Patient',
          lastName: email,
          phone: '',
          email,
        }),
      );
    }

    await this.providersRepository.save(
      this.providersRepository.create({
        userId: user.id,
        provider,
        providerUserId,
        email,
      }),
    );

    return user;
  }
}
