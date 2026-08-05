import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicEntity } from '../../entities/clinic.entity';
import { OtpCodeEntity } from '../../entities/otp-code.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SmsAuthController } from './sms-auth.controller';
import { SmsAuthService } from './sms-auth.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([OtpCodeEntity, PatientEntity, ClinicEntity]),
  ],
  controllers: [AuthController, SmsAuthController],
  providers: [AuthService, JwtAccessStrategy, SmsAuthService],
})
export class AuthModule {}
