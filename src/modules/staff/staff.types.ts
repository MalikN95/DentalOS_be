import { UserRole } from '../../common/enums/user-role.enum';

/** Roles that represent clinic employees (patients and platform admins excluded). */
export const STAFF_ROLES: readonly UserRole[] = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.DOCTOR,
  UserRole.RECEPTIONIST,
  UserRole.ASSISTANT,
  UserRole.ACCOUNTANT,
];

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface StaffDoctorServiceOption {
  id: string;
  name: string;
}

export interface StaffDoctorProfile {
  id: string;
  branchId: string | null;
  branchName: string | null;
  specializations: string[];
  education: string[];
  experienceYears: number;
  description: string | null;
  isActive: boolean;
  acceptsOnlineBooking: boolean;
  services: StaffDoctorServiceOption[];
}

export interface StaffMember {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Present only for users with the DOCTOR role that have a profile. */
  doctorProfile: StaffDoctorProfile | null;
}
