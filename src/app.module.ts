import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { envValidationSchema } from './config/env.validation';
import { buildTypeOrmOptions } from './config/typeorm.config';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAccessGuard } from './modules/auth/guards/jwt-access.guard';
import { BookingModule } from './modules/booking/booking.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CabinetsModule } from './modules/cabinets/cabinets.module';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { CrmModule } from './modules/crm/crm.module';
import { DentalChartModule } from './modules/dental-chart/dental-chart.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { EmailTemplatesModule } from './modules/email-templates/email-templates.module';
import { EmailsModule } from './modules/emails/emails.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { EventsModule } from './modules/events/events.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HealthModule } from './modules/health/health.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PatientTagsModule } from './modules/patient-tags/patient-tags.module';
import { PatientsModule } from './modules/patients/patients.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { SeedModule } from './modules/seed/seed.module';
import { ServicesModule } from './modules/services/services.module';
import { StaffModule } from './modules/staff/staff.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildTypeOrmOptions,
    }),
    NotificationsModule,
    StorageModule,
    EventsModule,
    AuditModule,
    HealthModule,
    ClinicsModule,
    UsersModule,
    AuthModule,
    BranchesModule,
    CabinetsModule,
    StaffModule,
    DoctorsModule,
    ServicesModule,
    PatientsModule,
    PatientTagsModule,
    EmailTemplatesModule,
    EmailsModule,
    AppointmentsModule,
    SchedulesModule,
    BookingModule,
    MedicalRecordsModule,
    DentalChartModule,
    FinanceModule,
    MarketingModule,
    CrmModule,
    AnalyticsModule,
    ReviewsModule,
    RemindersModule,
    EquipmentModule,
    SeedModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAccessGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
