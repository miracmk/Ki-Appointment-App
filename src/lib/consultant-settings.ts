/**
 * Consultant Settings Management Utilities
 * Used by admins to configure and manage consultant integrations
 */

import { getAdminFirestore } from './firebase-admin';
import { encryptSensitiveData } from './encryption';
import { ConsultantProfile, StripeSettings, CalendarIntegration, OutlookCalendarIntegration } from '@/types/marketplace';

/**
 * Update Stripe settings for a consultant
 */
export async function updateConsultantStripeSettings(
  consultantId: string,
  apiKey: string,
  webhookSecret: string
): Promise<void> {
  try {
    const db = getAdminFirestore();

    const apiKeyEncrypted = encryptSensitiveData(apiKey);
    const webhookSecretEncrypted = encryptSensitiveData(webhookSecret);

    await db.collection('users').doc(consultantId).update({
      'stripe_settings.api_key_encrypted': apiKeyEncrypted.encryptedData,
      'stripe_settings.api_key_iv': apiKeyEncrypted.iv,
      'stripe_settings.api_key_authTag': apiKeyEncrypted.authTag,
      'stripe_settings.webhook_secret_encrypted': webhookSecretEncrypted.encryptedData,
      'stripe_settings.webhook_secret_iv': webhookSecretEncrypted.iv,
      'stripe_settings.webhook_secret_authTag': webhookSecretEncrypted.authTag,
      'stripe_settings.is_active': true,
      'stripe_settings.updated_at': Date.now(),
      'updated_at': Date.now(),
    });

    console.log(`Updated Stripe settings for consultant ${consultantId}`);
  } catch (error) {
    console.error(`Error updating Stripe settings for consultant ${consultantId}:`, error);
    throw error;
  }
}

/**
 * Update calendar integration settings for a consultant
 */
export async function updateConsultantCalendar(
  consultantId: string,
  refreshToken: string,
  calendarId: string
): Promise<void> {
  try {
    const db = getAdminFirestore();
    const refreshTokenEncrypted = encryptSensitiveData(refreshToken);

    await db.collection('users').doc(consultantId).update({
      'calendar_integration.refresh_token_encrypted': refreshTokenEncrypted.encryptedData,
      'calendar_integration.refresh_token_iv': refreshTokenEncrypted.iv,
      'calendar_integration.refresh_token_authTag': refreshTokenEncrypted.authTag,
      'calendar_integration.calendar_id': calendarId,
      'calendar_integration.connected': true,
      'calendar_integration.updated_at': Date.now(),
      'updated_at': Date.now(),
    });

    console.log(`Updated calendar integration for consultant ${consultantId}`);
  } catch (error) {
    console.error(`Error updating calendar integration for consultant ${consultantId}:`, error);
    throw error;
  }
}

/**
 * Update Outlook Calendar settings for a consultant
 */
export async function updateConsultantOutlookCalendar(
  consultantId: string,
  refreshToken: string
): Promise<void> {
  try {
    const db = getAdminFirestore();
    const refreshTokenEncrypted = encryptSensitiveData(refreshToken);

    await db.collection('users').doc(consultantId).update({
      'outlook_calendar.refresh_token_encrypted': refreshTokenEncrypted.encryptedData,
      'outlook_calendar.refresh_token_iv': refreshTokenEncrypted.iv,
      'outlook_calendar.refresh_token_authTag': refreshTokenEncrypted.authTag,
      'outlook_calendar.connected': true,
      'outlook_calendar.updated_at': Date.now(),
      'updated_at': Date.now(),
    });

    console.log(`Updated Outlook Calendar for consultant ${consultantId}`);
  } catch (error) {
    console.error(`Error updating Outlook Calendar for consultant ${consultantId}:`, error);
    throw error;
  }
}

/**
 * Disable Stripe for a consultant
 */
export async function disableConsultantStripe(consultantId: string): Promise<void> {
  try {
    const db = getAdminFirestore();

    await db.collection('users').doc(consultantId).update({
      'stripe_settings.is_active': false,
      'updated_at': Date.now(),
    });

    console.log(`Disabled Stripe for consultant ${consultantId}`);
  } catch (error) {
    console.error(`Error disabling Stripe for consultant ${consultantId}:`, error);
    throw error;
  }
}

/**
 * Disconnect calendar integration for a consultant
 */
export async function disconnectCalendar(consultantId: string): Promise<void> {
  try {
    const db = getAdminFirestore();

    await db.collection('users').doc(consultantId).update({
      'calendar_integration.connected': false,
      'updated_at': Date.now(),
    });

    console.log(`Disconnected calendar integration for consultant ${consultantId}`);
  } catch (error) {
    console.error(`Error disconnecting calendar integration for consultant ${consultantId}:`, error);
    throw error;
  }
}

/**
 * Disconnect Outlook Calendar for a consultant
 */
export async function disconnectOutlookCalendar(consultantId: string): Promise<void> {
  try {
    const db = getAdminFirestore();

    await db.collection('users').doc(consultantId).update({
      'outlook_calendar.connected': false,
      'updated_at': Date.now(),
    });

    console.log(`Disconnected Outlook Calendar for consultant ${consultantId}`);
  } catch (error) {
    console.error(`Error disconnecting Outlook Calendar for consultant ${consultantId}:`, error);
    throw error;
  }
}
