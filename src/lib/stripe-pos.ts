import crypto from 'crypto';
import { KiStripePosSlot, PlatformSettings } from '@/types/marketplace';
import { getAdminFirestore } from './firebase-admin';
import { decryptSensitiveData, encryptSensitiveData } from './encryption';

const PLATFORM_SETTINGS_DOC = 'platform';
const PLATFORM_SETTINGS_COLLECTION = 'settings';

export interface DecryptedKiStripePosConfig {
  id: string;
  label: string;
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
}

function getPlatformSettingsRef() {
  const db = getAdminFirestore();
  return db.collection(PLATFORM_SETTINGS_COLLECTION).doc(PLATFORM_SETTINGS_DOC);
}

function decryptSlot(slot: KiStripePosSlot): DecryptedKiStripePosConfig {
  if (!slot.publishable_key_encrypted || !slot.publishable_key_iv || !slot.publishable_key_authTag) {
    throw new Error(`Missing publishable key encryption values for slot ${slot.id}`);
  }
  if (!slot.secret_key_encrypted || !slot.secret_key_iv || !slot.secret_key_authTag) {
    throw new Error(`Missing secret key encryption values for slot ${slot.id}`);
  }
  if (!slot.webhook_secret_encrypted || !slot.webhook_secret_iv || !slot.webhook_secret_authTag) {
    throw new Error(`Missing webhook secret encryption values for slot ${slot.id}`);
  }

  return {
    id: slot.id,
    label: slot.label,
    publishableKey: decryptSensitiveData(slot.publishable_key_encrypted, slot.publishable_key_iv, slot.publishable_key_authTag),
    secretKey: decryptSensitiveData(slot.secret_key_encrypted, slot.secret_key_iv, slot.secret_key_authTag),
    webhookSecret: decryptSensitiveData(slot.webhook_secret_encrypted, slot.webhook_secret_iv, slot.webhook_secret_authTag),
  };
}

export async function getActiveKiStripePosConfig(): Promise<DecryptedKiStripePosConfig> {
  const ref = getPlatformSettingsRef();
  const snapshot = await ref.get();
  const envPublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
  const envSecret = process.env.STRIPE_SECRET_KEY;
  const envWebhook = process.env.STRIPE_WEBHOOK_SECRET;

  if (!snapshot.exists) {
    if (envSecret && envWebhook) {
      return {
        id: 'env_fallback',
        label: 'Environment Stripe Key',
        publishableKey: envPublishable,
        secretKey: envSecret,
        webhookSecret: envWebhook,
      };
    }
    throw new Error('Ki Stripe POS settings are not configured yet.');
  }

  const settings = snapshot.data() as PlatformSettings;
  const slots = settings.ki_stripe_pos || [];
  const active = slots.find((slot) => slot.isActive);
  if (!active) {
    if (envSecret && envWebhook) {
      return {
        id: 'env_fallback',
        label: 'Environment Stripe Key',
        publishableKey: envPublishable,
        secretKey: envSecret,
        webhookSecret: envWebhook,
      };
    }
    throw new Error('No active Ki Stripe POS slot is configured.');
  }

  return decryptSlot(active);
}

export async function getKiStripePosSlots(): Promise<KiStripePosSlot[]> {
  const ref = getPlatformSettingsRef();
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return [];
  }

  const settings = snapshot.data() as PlatformSettings;
  return (settings.ki_stripe_pos || []).sort((left, right) => Number(right.isActive) - Number(left.isActive));
}

export async function upsertKiStripePosSlot(slot: Partial<KiStripePosSlot> & {
  id?: string;
  label: string;
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
}): Promise<KiStripePosSlot> {
  const ref = getPlatformSettingsRef();
  const snapshot = await ref.get();
  const settings = snapshot.exists ? (snapshot.data() as PlatformSettings) : {};
  const slots = settings.ki_stripe_pos || [];

  const now = Date.now();
  const slotId = slot.id || crypto.randomUUID();
  const encryptedPublishableKey = encryptSensitiveData(slot.publishableKey);
  const encryptedSecretKey = encryptSensitiveData(slot.secretKey);
  const encryptedWebhookSecret = encryptSensitiveData(slot.webhookSecret);

  const updatedSlot: KiStripePosSlot = {
    id: slotId,
    label: slot.label,
    isActive: slot.isActive ?? false,
    publishable_key_encrypted: encryptedPublishableKey.encryptedData,
    publishable_key_iv: encryptedPublishableKey.iv,
    publishable_key_authTag: encryptedPublishableKey.authTag,
    secret_key_encrypted: encryptedSecretKey.encryptedData,
    secret_key_iv: encryptedSecretKey.iv,
    secret_key_authTag: encryptedSecretKey.authTag,
    webhook_secret_encrypted: encryptedWebhookSecret.encryptedData,
    webhook_secret_iv: encryptedWebhookSecret.iv,
    webhook_secret_authTag: encryptedWebhookSecret.authTag,
    created_at: slot.id ? (slots.find((item) => item.id === slot.id)?.created_at ?? now) : now,
    updated_at: now,
  };

  const mergedSlots = slots.filter((item) => item.id !== slotId).concat(updatedSlot);
  await ref.set({ ki_stripe_pos: mergedSlots }, { merge: true });

  return updatedSlot;
}

export async function setActiveKiStripePosSlot(slotId: string): Promise<void> {
  const ref = getPlatformSettingsRef();
  const snapshot = await ref.get();
  const settings = snapshot.exists ? (snapshot.data() as PlatformSettings) : {};
  const slots = settings.ki_stripe_pos || [];

  const updatedSlots = slots.map((slot) => ({
    ...slot,
    isActive: slot.id === slotId,
    updated_at: Date.now(),
  }));

  await ref.set({ ki_stripe_pos: updatedSlots }, { merge: true });
}

export async function deleteKiStripePosSlot(slotId: string): Promise<void> {
  const ref = getPlatformSettingsRef();
  const snapshot = await ref.get();
  const settings = snapshot.exists ? (snapshot.data() as PlatformSettings) : {};
  const slots = settings.ki_stripe_pos || [];
  const updatedSlots = slots.filter((slot) => slot.id !== slotId);

  await ref.set({ ki_stripe_pos: updatedSlots }, { merge: true });
}
