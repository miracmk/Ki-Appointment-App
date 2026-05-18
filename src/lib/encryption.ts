import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): crypto.KeyObject {
  const raw = (process.env.ENCRYPTION_KEY || 'default-dev-key-not-for-production-use-24-chars')
    .padEnd(32, '0')
    .slice(0, 32);
  return crypto.createSecretKey(Uint8Array.from(Buffer.from(raw, 'utf8')));
}

export function encryptSensitiveData(plaintext: string): {
  encryptedData: string;
  iv: string;
  authTag: string;
} {
  const ivBuf = crypto.randomBytes(16);
  const iv = Uint8Array.from(ivBuf);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv) as crypto.CipherGCM;

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: ivBuf.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

export function decryptSensitiveData(encryptedData: string, iv: string, authTag: string): string {
  const ivBytes = Uint8Array.from(Buffer.from(iv, 'hex'));
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    ivBytes
  ) as crypto.DecipherGCM;

  decipher.setAuthTag(Uint8Array.from(Buffer.from(authTag, 'hex')));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
