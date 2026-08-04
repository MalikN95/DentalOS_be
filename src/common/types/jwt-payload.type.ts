import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  // null for super_admin — a platform-wide account with no home clinic.
  clinicId: string | null;
  role: UserRole;
}

export type JwtRefreshPayload = JwtPayload & {
  jti: string;
};
