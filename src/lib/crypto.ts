import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-not-for-production-use-24-chars';
const ALGORITHM = 'aes-256-cbc';
const HMAC_ALGORITHM = 'sha256';

function getEncryptionKey(): Uint8Array {
  return Uint8Array.from(Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32), 'utf8'));
}

function computeAuthTag(iv: string, encryptedData: string): string {
  return crypto
    .createHmac(HMAC_ALGORITHM, getEncryptionKey())
    .update(Uint8Array.from(Buffer.from(iv, 'hex')))
    .update(encryptedData)
    .digest('hex');
}

export function encryptSensitiveData(plaintext: string): {
  encryptedData: string;
  iv: string;
  authTag: string;
} {
  const iv = Uint8Array.from(crypto.randomBytes(16));
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const ivHex = Buffer.from(iv).toString('hex');

  return {
    encryptedData: encrypted,
    iv: ivHex,
    authTag: computeAuthTag(ivHex, encrypted),
  };
}

export function decryptSensitiveData(encryptedData: string, iv: string, authTag: string): string {
  const calculatedAuthTag = computeAuthTag(iv, encryptedData);
  if (!crypto.timingSafeEqual(
    Uint8Array.from(Buffer.from(calculatedAuthTag, 'hex')),
    Uint8Array.from(Buffer.from(authTag, 'hex'))
  )) {
    throw new Error('Failed to verify encrypted data integrity');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Uint8Array.from(Buffer.from(iv, 'hex')));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
