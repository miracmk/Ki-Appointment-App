/**
 * Marketplace Type Definitions
 * Schema for consultant profiles, integrations, and appointments
 */

export interface StripeSettings {
  api_key_encrypted?: string;
  api_key_iv?: string;
  api_key_authTag?: string;
  webhook_secret_encrypted?: string;
  webhook_secret_iv?: string;
  webhook_secret_authTag?: string;
  is_active: boolean;
  updated_at?: number;
}

export interface GoogleCalendarIntegration {
  refresh_token_encrypted?: string;
  refresh_token_iv?: string;
  refresh_token_authTag?: string;
  access_token_encrypted?: string;
  access_token_iv?: string;
  access_token_authTag?: string;
  access_token_expiry?: number;
  connected: boolean;
  calendar_id?: string;
  updated_at?: number;
}

export interface OutlookCalendarIntegration {
  refresh_token_encrypted?: string;
  refresh_token_iv?: string;
  refresh_token_authTag?: string;
  access_token_encrypted?: string;
  access_token_iv?: string;
  access_token_authTag?: string;
  access_token_expiry?: number;
  connected: boolean;
  calendar_id?: string;
  updated_at?: number;
}

export interface ConsultantProfile {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'consultant'; // 'admin' is the platform owner
  is_active: boolean;
  stripe_settings: StripeSettings;
  google_calendar: GoogleCalendarIntegration;
  outlook_calendar: OutlookCalendarIntegration;
  timezone?: string;
  created_at: number;
  updated_at: number;
}

export interface AppointmentMetadata {
  consultant_id: string;
  customer_email: string;
  customer_name?: string;
  appointment_date: string; // ISO 8601 UTC
  appointment_time: string; // HH:mm format
  appointment_timezone?: string;
  package_id: string;
  session_id?: string;
  stripe_session_id?: string;
}

export interface Appointment {
  id: string;
  consultant_id: string;
  customer_email: string;
  customer_name?: string;
  appointment_date: string; // ISO 8601 UTC
  appointment_time: string; // HH:mm format
  appointment_timezone?: string;
  package_id: string;
  stripe_session_id?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  calendar_event_ids?: {
    google?: string;
    outlook?: string;
  };
  created_at: number;
  updated_at: number;
  payment_amount: number;
}

export interface WebhookPayloadMetadata {
  consultant_id: string;
  appointment_id?: string;
  package_id?: string;
}
