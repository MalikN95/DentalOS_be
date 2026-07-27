import { LeadStage } from '../../../entities/lead.entity';
import { PaymentMethod } from '../../../entities/payment.entity';

export interface RevenueByDayItem {
  date: string;
  amount: number;
}

export interface RevenueByMethodItem {
  method: PaymentMethod;
  amount: number;
}

export interface RevenueAnalytics {
  totalPaid: number;
  totalRefunded: number;
  net: number;
  byDay: RevenueByDayItem[];
  byMethod: RevenueByMethodItem[];
}

export interface DoctorLoadItem {
  doctorProfileId: string;
  doctorName: string;
  appointmentsCount: number;
  minutesBooked: number;
}

export interface RepeatVisitsAnalytics {
  totalPatients: number;
  repeatPatients: number;
  rate: number;
}

export interface ConversionAnalytics {
  stages: Record<LeadStage, number>;
  rate: number;
}

export interface TopServiceItem {
  serviceId: string;
  name: string;
  count: number;
  revenue: number;
}

export interface CancellationsAnalytics {
  cancelled: number;
  noShow: number;
  total: number;
  cancellationRate: number;
  noShowRate: number;
}
