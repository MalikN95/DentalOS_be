export interface ClinicAdminSummary {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  currency: string;
  language: string;
  isActive: boolean;
  doctorsCount: number;
  patientsCount: number;
  createdAt: Date;
}

export interface ClinicAdminDetail extends ClinicAdminSummary {
  totalRevenue: number;
}

export interface PlatformOverviewStats {
  totalClinics: number;
  activeClinics: number;
  blockedClinics: number;
  totalDoctors: number;
  totalPatients: number;
  totalRevenue: number;
}

export interface MonthlyCountPoint {
  month: string;
  count: number;
}

export interface MonthlyTotalPoint {
  month: string;
  total: number;
}
