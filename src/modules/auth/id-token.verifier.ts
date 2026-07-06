import {
  createPublicKey,
  type JsonWebKey,
  verify as verifySignature,
} from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';

interface Jwk {
  kid?: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

interface JwksResponse {
  keys: Jwk[];
}

interface IdTokenHeader {
  alg?: string;
  kid?: string;
}

interface IdTokenClaims {
  sub?: string;
  email?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
}

export interface IdTokenVerifyOptions {
  jwksUri: string;
  issuers: string[];
  audience: string;
}

export interface VerifiedIdToken {
  sub: string;
  email: string | null;
}

interface JwksCacheEntry {
  keys: Jwk[];
  fetchedAt: number;
}

const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

// Verifies RS256 ID tokens (Google / Apple Sign-In) using only node:crypto
// and global fetch — no external JWT/JWKS libraries.
@Injectable()
export class IdTokenVerifier {
  private readonly jwksCache = new Map<string, JwksCacheEntry>();

  async verify(
    idToken: string,
    options: IdTokenVerifyOptions,
  ): Promise<VerifiedIdToken> {
    const segments = idToken.split('.');

    if (segments.length !== 3) {
      throw new UnauthorizedException('Malformed ID token');
    }

    const [headerB64, payloadB64, signatureB64] = segments;
    const header = this.decodeSegment<IdTokenHeader>(headerB64);
    const claims = this.decodeSegment<IdTokenClaims>(payloadB64);

    if (header.alg !== 'RS256' || !header.kid) {
      throw new UnauthorizedException('Unsupported ID token algorithm');
    }

    const jwk = await this.getSigningKey(options.jwksUri, header.kid);
    const publicKey = createPublicKey({
      key: jwk as JsonWebKey,
      format: 'jwk',
    });

    const signatureValid = verifySignature(
      'RSA-SHA256',
      Buffer.from(`${headerB64}.${payloadB64}`),
      publicKey,
      Buffer.from(signatureB64, 'base64url'),
    );

    if (signatureValid === false) {
      throw new UnauthorizedException('ID token signature is invalid');
    }

    this.assertClaims(claims, options);

    return { sub: claims.sub as string, email: claims.email ?? null };
  }

  private assertClaims(
    claims: IdTokenClaims,
    options: IdTokenVerifyOptions,
  ): void {
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (!claims.exp || claims.exp <= nowSeconds) {
      throw new UnauthorizedException('ID token is expired');
    }

    if (!claims.iss || options.issuers.includes(claims.iss) === false) {
      throw new UnauthorizedException('ID token issuer is not trusted');
    }

    const audiences = Array.isArray(claims.aud)
      ? claims.aud
      : [claims.aud ?? ''];

    if (audiences.includes(options.audience) === false) {
      throw new UnauthorizedException('ID token audience mismatch');
    }

    if (!claims.sub) {
      throw new UnauthorizedException('ID token has no subject');
    }
  }

  private decodeSegment<T>(segment: string): T {
    try {
      return JSON.parse(
        Buffer.from(segment, 'base64url').toString('utf8'),
      ) as T;
    } catch {
      throw new UnauthorizedException('Malformed ID token');
    }
  }

  private async getSigningKey(jwksUri: string, kid: string): Promise<Jwk> {
    const cached = this.jwksCache.get(jwksUri);
    const cacheValid =
      cached !== undefined && Date.now() - cached.fetchedAt < JWKS_CACHE_TTL_MS;

    if (cacheValid) {
      const key = cached.keys.find((jwk) => jwk.kid === kid);

      if (key) {
        return key;
      }
    }

    // Cache miss or unknown kid (key rotation) — refetch
    const keys = await this.fetchJwks(jwksUri);
    this.jwksCache.set(jwksUri, { keys, fetchedAt: Date.now() });

    const key = keys.find((jwk) => jwk.kid === kid);

    if (!key) {
      throw new UnauthorizedException('ID token signing key not found');
    }

    return key;
  }

  private async fetchJwks(jwksUri: string): Promise<Jwk[]> {
    let response: Response;

    try {
      response = await fetch(jwksUri);
    } catch {
      throw new UnauthorizedException('Failed to fetch provider signing keys');
    }

    if (response.ok === false) {
      throw new UnauthorizedException('Failed to fetch provider signing keys');
    }

    const body = (await response.json()) as JwksResponse;

    if (!Array.isArray(body.keys)) {
      throw new UnauthorizedException('Provider returned malformed JWKS');
    }

    return body.keys;
  }
}
