import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { PaymentEntity } from '../../entities/payment.entity';
import { UserEntity } from '../../entities/user.entity';
import {
  MonthlyCountPoint,
  MonthlyTotalPoint,
  PlatformOverviewStats,
} from './types/platform-admin-results.type';

@Injectable()
export class StatsAdminService {
  constructor(
    @InjectRepository(ClinicEntity)
    private readonly clinicsRepository: Repository<ClinicEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
  ) {}

  async getOverview(): Promise<PlatformOverviewStats> {
    const [totalClinics, activeClinics, totalDoctors, totalPatients, revenueRow] =
      await Promise.all([
        this.clinicsRepository.count(),
        this.clinicsRepository.count({ where: { isActive: true } }),
        this.usersRepository.count({
          where: { role: UserRole.DOCTOR, isActive: true },
        }),
        this.patientsRepository.count(),
        this.paymentsRepository
          .createQueryBuilder('payment')
          .select('COALESCE(SUM(payment.amount), 0)', 'total')
          .getRawOne<{ total: string }>(),
      ]);

    return {
      totalClinics,
      activeClinics,
      blockedClinics: totalClinics - activeClinics,
      totalDoctors,
      totalPatients,
      totalRevenue: Number(revenueRow?.total ?? 0),
    };
  }

  async getRevenueByMonth(months: number): Promise<MonthlyTotalPoint[]> {
    const since = this.startOfMonthsAgo(months);

    const rows = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select("TO_CHAR(payment.createdAt, 'YYYY-MM')", 'month')
      .addSelect('SUM(payment.amount)', 'total')
      .where('payment.createdAt >= :since', { since })
      .groupBy("TO_CHAR(payment.createdAt, 'YYYY-MM')")
      .getRawMany<{ month: string; total: string }>();

    const totals = new Map(rows.map((row) => [row.month, Number(row.total)]));

    return this.buildMonthRange(months).map((month) => ({
      month,
      total: totals.get(month) ?? 0,
    }));
  }

  async getClinicsGrowth(months: number): Promise<MonthlyCountPoint[]> {
    const since = this.startOfMonthsAgo(months);

    const rows = await this.clinicsRepository
      .createQueryBuilder('clinic')
      .select("TO_CHAR(clinic.createdAt, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .where('clinic.createdAt >= :since', { since })
      .groupBy("TO_CHAR(clinic.createdAt, 'YYYY-MM')")
      .getRawMany<{ month: string; count: string }>();

    const counts = new Map(rows.map((row) => [row.month, Number(row.count)]));

    return this.buildMonthRange(months).map((month) => ({
      month,
      count: counts.get(month) ?? 0,
    }));
  }

  // Zero-filled so charts never show a gap for a month with no rows.
  private buildMonthRange(months: number): string[] {
    const now = new Date();

    return Array.from({ length: months }, (_, index) => {
      const date = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1) + index, 1),
      );
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    });
  }

  private startOfMonthsAgo(months: number): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  }
}
