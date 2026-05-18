import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-not-for-production-use-24-chars';
const ALGORITHM = 'aes-256-cbc';
const HMAC_ALGORITHM = 'sha256';

function getEncryptionKey(): Uint8Array {
  return Buffer.from(ENCRYPTION_KEY.padEnd(32, '0')).slice(0, 32) as unknown as Uint8Array;
}

function computeAuthTag(iv: string, encryptedData: string): string {
  return crypto
    .createHmac(HMAC_ALGORITHM, getEncryptionKey())
    .update(Buffer.from(iv, 'hex') as unknown as Uint8Array)
    .update(encryptedData)
    .digest('hex');
}

export function encryptSensitiveData(plaintext: string): {
  encryptedData: string;
  iv: string;
  authTag: string;
} {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv as unknown as Uint8Array);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: computeAuthTag(iv.toString('hex'), encrypted),
  };
}

export function decryptSensitiveData(encryptedData: string, iv: string, authTag: string): string {
  const calculatedAuthTag = computeAuthTag(iv, encryptedData);
  if (!crypto.timingSafeEqual(new Uint8Array(Buffer.from(calculatedAuthTag, 'hex')), new Uint8Array(Buffer.from(authTag, 'hex')))) {
    throw new Error('Failed to verify encrypted data integrity');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(iv, 'hex') as unknown as Uint8Array);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
