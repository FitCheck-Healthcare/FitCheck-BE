import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const VERSION = 'v1';

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY 환경변수가 없습니다. backend/.env 를 확인하세요.',
    );
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY는 32바이트(base64)여야 합니다.');
  }

  return key;
}

function getPhoneHmacPepper(): string {
  const pepper = process.env.PHONE_HMAC_PEPPER?.trim();
  if (!pepper) {
    throw new Error(
      'PHONE_HMAC_PEPPER 환경변수가 없습니다. backend/.env 를 확인하세요.',
    );
  }
  return pepper;
}

/** AES-256-GCM; returns `v1:<iv>:<tag>:<ciphertext>` (base64url). */
export function encryptField(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

/** Decrypts v1 ciphertext; legacy plaintext (no prefix) is returned as-is. */
export function decryptField(value: string): string {
  if (!value) return value;
  if (!value.startsWith(`${VERSION}:`)) return value;

  const parts = value.split(':');
  if (parts.length !== 4) return value;

  const [, ivB64, tagB64, dataB64] = parts;
  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    ALGO,
    key,
    Buffer.from(ivB64, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));

  return (
    decipher.update(dataB64, 'base64url', 'utf8') + decipher.final('utf8')
  );
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function hashPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return createHmac('sha256', getPhoneHmacPepper())
    .update(normalized)
    .digest('hex');
}

/** Masks phone for list responses, e.g. 010-****-5678 */
export function maskPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length < 8) return '****';

  const last4 = digits.slice(-4);
  if (digits.startsWith('02')) {
    return `02-****-${last4}`;
  }
  if (digits.length >= 11) {
    return `${digits.slice(0, 3)}-****-${last4}`;
  }
  return `${digits.slice(0, 3)}-****-${last4}`;
}

export function isEncryptedField(value: string): boolean {
  return value.startsWith(`${VERSION}:`);
}
