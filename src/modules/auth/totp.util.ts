import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// RFC 4648 base32 alphabet (no padding used for TOTP secrets)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;

const base32Encode = (buffer: Buffer): string => {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

const base32Decode = (input: string): Buffer => {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of input.toUpperCase().replace(/=+$/u, '')) {
    const index = BASE32_ALPHABET.indexOf(char);

    if (index === -1) {
      throw new Error(`Invalid base32 character: '${char}'`);
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

// RFC 4226 HOTP with dynamic truncation
const hotp = (key: Buffer, counter: number): string => {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;

  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];

  return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
};

export const generateTotpSecret = (): string => base32Encode(randomBytes(20));

// RFC 6238 TOTP: SHA-1, 30s period, 6 digits, ±1 period clock drift window
export const verifyTotp = (secret: string, code: string): boolean => {
  if (new RegExp(`^\\d{${TOTP_DIGITS}}$`, 'u').test(code) === false) {
    return false;
  }

  let key: Buffer;

  try {
    key = base32Decode(secret);
  } catch {
    return false;
  }

  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);
  const codeBuffer = Buffer.from(code);
  let valid = false;

  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
    const expected = Buffer.from(hotp(key, counter + offset));

    // No early return: constant-time over the whole window
    if (timingSafeEqual(expected, codeBuffer)) {
      valid = true;
    }
  }

  return valid;
};

export const buildOtpauthUrl = (
  secret: string,
  label: string,
  issuer = 'DentalOS',
): string => {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedLabel = encodeURIComponent(label);

  return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
};
