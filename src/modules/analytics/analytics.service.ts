import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { LeadEntity, LeadStage } from '../../entities/lead.entity';
import { PaymentEntity, PaymentMethod } from '../../entities/payment.entity';
import { RefundEntity } from '../../entities/refund.entity';
import { PeriodQueryDto } from './dto/period-query.dto';
import {
  CancellationsAnalytics,
  ConversionAnalytics,
  DoctorLoadItem,
  RepeatVisitsAnalytics,
  RevenueAnalytics,
  TopServiceItem,
} from './types/analytics-results.type';

const LOAD_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.ARRIVED,
  AppointmentStatus.IN_TREATMENT,
  AppointmentStatus.COMPLETED,
];

interface Period {
  from: Date;
  to: Date;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    @InjectRepository(RefundEntity)
    private readonly refundsRepository: Repository<RefundEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentsRepository: Repository<AppointmentEntity>,
    @InjectRepository(LeadEntity)
    private readonly leadsRepository: Repository<LeadEntity>,
  ) {}

  async getRevenue(
    clinicId: string,
    query: PeriodQueryDto,
  ): Promise<RevenueAnalytics> {
    const { from, to } = this.parsePeriod(query);

    const paidRow = await this.paymentsRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.invoice', 'invoice')
      .select('COALESCE(SUM(payment.amount), 0)', 'total')
      .where('invoice.clinicId = :clinicId', { clinicId })
      .andWhere('payment.createdAt BETWEEN :from AND :to', { from, to })
      .getRawOne<{ total: string }>();

    const refundedRow = await this.refundsRepository
      .createQueryBuilder('refund')
      .innerJoin('refund.payment', 'payment')
      .innerJoin('payment.invoice', 'invoice')
      .select('COALESCE(SUM(refund.amount), 0)', 'total')
      .where('invoice.clinicId = :clinicId', { clinicId })
      .andWhere('refund.createdAt BETWEEN :from AND :to', { from, to })
      .getRawOne<{ total: string }>();

    const byDayRows = await this.paymentsRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.invoice', 'invoice')
      .select("TO_CHAR(payment.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(payment.amount)', 'amount')
      .where('invoice.clinicId = :clinicId', { clinicId })
      .andWhere('payment.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy("TO_CHAR(payment.createdAt, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(payment.createdAt, 'YYYY-MM-DD')", 'ASC')
      .getRawMany<{ date: string; amount: string }>();

    const byMethodRows = await this.paymentsRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.invoice', 'invoice')
      .select('payment.method', 'method')
      .addSelect('SUM(payment.amount)', 'amount')
      .where('invoice.clinicId = :clinicId', { clinicId })
      .andWhere('payment.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('payment.method')
      .orderBy('SUM(payment.amount)', 'DESC')
      .getRawMany<{ method: PaymentMethod; amount: string }>();

    const totalPaid = Number(paidRow?.total ?? 0);
    const totalRefunded = Number(refundedRow?.total ?? 0);

    return {
      totalPaid,
      totalRefunded,
      net: this.round(totalPaid - totalRefunded),
      byDay: byDayRows.map((row) => ({
        date: row.date,
        amount: Number(row.amount),
      })),
      byMethod: byMethodRows.map((row) => ({
        method: row.method,
        amount: Number(row.amount),
      })),
    };
  }

  async getDoctorsLoad(
    clinicId: string,
    query: PeriodQueryDto,
  ): Promise<DoctorLoadItem[]> {
    const { from, to } = this.parsePeriod(query);

    const rows = await this.appointmentsRepository
      .createQueryBuilder('appointment')
      .innerJoin('appointment.doctorProfile', 'doctorProfile')
      .innerJoin('doctorProfile.user', 'user')
      .select('appointment.doctorProfileId', 'doctorProfileId')
      .addSelect("CONCAT(user.lastName, ' ', user.firstName)", 'doctorName')
      .addSelect('COUNT(*)', 'appointmentsCount')
      .addSelect(
        'COALESCE(SUM(EXTRACT(EPOCH FROM (appointment.endsAt - appointment.startsAt)) / 60), 0)',
        'minutesBooked',
      )
      .where('appointment.clinicId = :clinicId', { clinicId })
      .andWhere('appointment.startsAt BETWEEN :from AND :to', { from, to })
      .andWhere('appointment.status IN (:...statuses)', {
        statuses: LOAD_STATUSES,
      })
      .groupBy('appointment.doctorProfileId')
      .addGroupBy('user.lastName')
      .addGroupBy('user.firstName')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{
        doctorProfileId: string;
        doctorName: string;
        appointmentsCount: string;
        minutesBooked: string;
      }>();

    return rows.map((row) => ({
      doctorProfileId: row.doctorProfileId,
      doctorName: row.doctorName,
      appointmentsCount: Number(row.appointmentsCount),
      minutesBooked: Math.round(Number(row.minutesBooked)),
    }));
  }

  async getRepeatVisits(
    clinicId: string,
    query: PeriodQueryDto,
  ): Promise<RepeatVisitsAnalytics> {
    const { from, to } = this.parsePeriod(query);

    const rows = await this.appointmentsRepository
      .createQueryBuilder('appointment')
      .select('appointment.patientId', 'patientId')
      .addSelect('COUNT(*)', 'visits')
      .where('appointment.clinicId = :clinicId', { clinicId })
      .andWhere('appointment.startsAt BETWEEN :from AND :to', { from, to })
      .andWhere('appointment.status = :status', {
        status: AppointmentStatus.COMPLETED,
      })
      .groupBy('appointment.patientId')
      .getRawMany<{ patientId: string; visits: string }>();

    const totalPatients = rows.length;
    const repeatPatients = rows.filter((row) => Number(row.visits) > 1).length;

    return {
      totalPatients,
      repeatPatients,
      rate: totalPatients > 0 ? this.round(repeatPatients / totalPatients) : 0,
    };
  }

  async getConversion(
    clinicId: string,
    query: PeriodQueryDto,
  ): Promise<ConversionAnalytics> {
    const { from, to } = this.parsePeriod(query);

    const rows = await this.leadsRepository
      .createQueryBuilder('lead')
      .select('lead.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('lead.clinicId = :clinicId', { clinicId })
      .andWhere('lead.createdAt BETWEEN :from AND :to', { from, to })
      .groupBy('lead.stage')
      .getRawMany<{ stage: LeadStage; count: string }>();

    const stages = Object.values(LeadStage).reduce<Record<LeadStage, number>>(
      (acc, stage) => {
        acc[stage] = 0;
        return acc;
      },
      {} as Record<LeadStage, number>,
    );

    rows.forEach((row) => {
      stages[row.stage] = Number(row.count);
    });

    const newCount = stages[LeadStage.NEW];
    const paidCount = stages[LeadStage.PAID];

    return {
      stages,
      rate: newCount > 0 ? this.round(paidCount / newCount) : 0,
    };
  }

  async getTopServices(
    clinicId: string,
    query: PeriodQueryDto,
  ): Promise<TopServiceItem[]> {
    const { from, to } = this.parsePeriod(query);

    const rows = await this.appointmentsRepository
      .createQueryBuilder('appointment')
      .innerJoin('appointment.service', 'service')
      .select('appointment.serviceId', 'serviceId')
      .addSelect('service.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        'COALESCE(SUM(CASE WHEN appointment.status = :completed THEN appointment.price ELSE 0 END), 0)',
        'revenue',
      )
      .where('appointment.clinicId = :clinicId', { clinicId })
      .andWhere('appointment.startsAt BETWEEN :from AND :to', { from, to })
      .setParameter('completed', AppointmentStatus.COMPLETED)
      .groupBy('appointment.serviceId')
      .addGroupBy('service.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany<{
        serviceId: string;
        name: string;
        count: string;
        revenue: string;
      }>();

    return rows.map((row) => ({
      serviceId: row.serviceId,
      name: row.name,
      count: Number(row.count),
      revenue: Number(row.revenue),
    }));
  }

  async getCancellations(
    clinicId: string,
    query: PeriodQueryDto,
  ): Promise<CancellationsAnalytics> {
    const { from, to } = this.parsePeriod(query);

    const row = await this.appointmentsRepository
      .createQueryBuilder('appointment')
      .select('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN appointment.status = :cancelled THEN 1 ELSE 0 END)',
        'cancelled',
      )
      .addSelect(
        'SUM(CASE WHEN appointment.status = :noShow THEN 1 ELSE 0 END)',
        'noShow',
      )
      .where('appointment.clinicId = :clinicId', { clinicId })
      .andWhere('appointment.startsAt BETWEEN :from AND :to', { from, to })
      .setParameters({
        cancelled: AppointmentStatus.CANCELLED,
        noShow: AppointmentStatus.NO_SHOW,
      })
      .getRawOne<{ total: string; cancelled: string; noShow: string }>();

    const total = Number(row?.total ?? 0);
    const cancelled = Number(row?.cancelled ?? 0);
    const noShow = Number(row?.noShow ?? 0);

    return {
      cancelled,
      noShow,
      total,
      cancellationRate: total > 0 ? this.round(cancelled / total) : 0,
      noShowRate: total > 0 ? this.round(noShow / total) : 0,
    };
  }

  private parsePeriod(query: PeriodQueryDto): Period {
    const from = new Date(query.from);
    const to = new Date(query.to);

    if (from > to) {
      throw new BadRequestException("'from' must be before or equal to 'to'");
    }

    return { from, to };
  }

  private round(value: number): number {
    return Number(value.toFixed(4));
  }
}
