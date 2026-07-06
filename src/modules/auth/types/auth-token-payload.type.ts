import { JwtPayload } from '../../../common/types/jwt-payload.type';

// Short-lived token issued after password check when MFA is enabled;
// grants access ONLY to POST /auth/mfa/verify
export type MfaPendingPayload = JwtPayload & {
  mfa: 'pending';
};

// What actually arrives in the access-token strategy: a regular access
// token, or (if someone tries to abuse it) an MFA-pending token
export type AccessTokenPayload = JwtPayload & {
  mfa?: 'pending';
};
