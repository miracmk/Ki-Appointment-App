import crypto from 'crypto';

/**
 * Encryption utility for storing sensitive API keys in Firestore
 * Uses AES-256-GCM for authenticated encryption
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-not-for-production-use-24-chars';
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a string value (e.g., API keys, tokens)
 */
export function encryptSensitiveData(plaintext: string): {
  encryptedData: string;
  iv: string;
  authTag: string;
} {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0')).slice(0, 32), iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt an encrypted value back to plaintext
 */
export function decryptSensitiveData(encryptedData: string, iv: string, authTag: string): string {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0')).slice(0, 32),
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}
