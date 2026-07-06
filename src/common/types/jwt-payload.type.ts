import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  clinicId: string;
  role: UserRole;
}

export type JwtRefreshPayload = JwtPayload & {
  jti: string;
};
