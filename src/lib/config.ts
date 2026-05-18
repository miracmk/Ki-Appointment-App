export interface AdminSettings {
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  googleApiKey?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleCalendarId?: string;
  googleServiceAccountKey?: string;
}

export const LOCAL_SETTINGS_KEY = 'kbs-admin-settings';

export function loadAdminSettings(): AdminSettings {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as AdminSettings;
  } catch {
    return {};
  }
}

export function saveAdminSettings(settings: AdminSettings) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
}

export function getServerStripeSecret(body?: any): string | undefined {
  return process.env.STRIPE_SECRET_KEY || body?.stripeSecretKey;
}

export function getServerStripeWebhookSecret(body?: any): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET || body?.stripeWebhookSecret;
}

export function getServerGoogleConfig(body?: any) {
  return {
    serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || body?.googleServiceAccountKey,
    calendarId: process.env.GOOGLE_CALENDAR_ID || body?.googleCalendarId,
  };
}
