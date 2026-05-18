export type UserRole = 'admin' | 'supervisor' | 'consultant' | 'consulter';

/** How a consultant receives payments through the platform */
export type PaymentMode =
  | 'ki_escrow'   // Ki Business collects, transfers to consultant minus fees
  | 'own_keys'    // Consultant uses own Stripe keys; owes 10% by contract
  | 'ki_connect'  // Stripe Connect: auto-split at checkout (10% platform fee)
  | 'direct';     // Ki Business itself is the consultant; no platform fee

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
  role: UserRole;
  is_active: boolean;
  photo_url?: string;
  title?: string;
  expertise?: string;

  // Payment configuration
  payment_mode: PaymentMode;
  /** Stripe Connect account ID (required for ki_connect and ki_escrow) */
  stripe_connect_account_id?: string;
  /** Running total (cents) of platform fee owed under own_keys mode */
  platform_fee_owed_cents?: number;

  stripe_settings: StripeSettings;
  google_calendar: GoogleCalendarIntegration;
  outlook_calendar: OutlookCalendarIntegration;

  timezone?: string;
  onboarding_status?: 'email_pending' | 'form_pending' | 'complete';
  created_at: number;
  updated_at: number;
}

export interface PublicConsultantInfo {
  uid: string;
  name: string;
  title?: string;
  expertise?: string;
  photo_url?: string;
}

export interface AppointmentMetadata {
  consultant_id: string;
  customer_email: string;
  customer_name?: string;
  appointment_date: string;
  appointment_time: string;
  appointment_timezone?: string;
  package_id: string;
  /** payment mode at time of booking */
  payment_mode?: PaymentMode;
  session_id?: string;
  stripe_session_id?: string;
}

export interface Appointment {
  id: string;
  consultant_id: string;
  customer_email: string;
  customer_name?: string;
  appointment_date: string;
  appointment_time: string;
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

export interface FeeBreakdown {
  gross_cents: number;
  stripe_fee_cents: number;
  net_cents: number;
  platform_fee_cents: number;
  consultant_payout_cents: number;
}

export interface FlatAppointment {
  id: string;
  consultant_id: string;
  consultant_name?: string;
  customer_email: string;
  customer_name?: string;
  appointment_date: string;
  appointment_time: string;
  appointment_timezone: string;
  package_id: string;
  package_name: string;
  status: string;
  payment_amount: number;
  payment_mode: PaymentMode;
  stripe_session_id?: string;
  /** Stripe Transfer ID (after escrow payout) */
  stripe_transfer_id?: string;

  // Fee breakdown (populated at webhook time)
  stripe_fee_cents?: number;
  platform_fee_cents?: number;
  consultant_payout_cents?: number;

  /** Whether the consultant has been paid (for escrow mode) */
  payout_status?: 'pending' | 'paid' | 'na';

  onboarding_status: 'form_pending' | 'complete';
  created_at: number;
  updated_at: number;
}

export interface OnboardingProfile {
  uid?: string;
  customer_email: string;
  appointment_id: string;
  first_name: string;
  last_name: string;
  company: string;
  sector: string;
  employee_count: string;
  description: string;
  submitted_at: number;
}

export interface WebhookPayloadMetadata {
  consultant_id: string;
  appointment_id?: string;
  package_id?: string;
}
