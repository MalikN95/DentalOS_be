import { AppointmentStatus } from '../../../common/enums/appointment-status.enum';

export interface PatientPortalProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

export interface PatientPortalAppointmentSummary {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  serviceName: string;
  doctorName: string;
  branchName: string;
  price: string;
  comment: string | null;
  cancellationReason: string | null;
  cancelledBy: 'patient' | 'staff' | null;
  isCancellable: boolean;
}

export type PatientPortalAppointmentScope = 'upcoming' | 'past';
