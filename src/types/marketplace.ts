// ─── Roles & Modes ──────────────────────────────────────────────────────────

// Strict RBAC roles (lowercase, matches Firestore values)
export type UserRole = 'admin' | 'supervisor' | 'consultant' | 'client';

// ─── Firestore User Document ────────────────────────────────────────────────

export interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  modes: ('consultant' | 'client')[];
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  walletBalance: number;   // stored in cents
  createdAt: number;
  isActive: boolean;
}

// ─── KYC Application ─────────────────────────────────────────────────────────

export interface KycApplication {
  userId: string;
  appliedRole: 'consultant';
  status: 'pending' | 'approved' | 'rejected';
  firstName: string;
  lastName: string;
  nationalId: string;
  dateOfBirth: string;     // "YYYY-MM-DD"
  documentUrls: string[];  // uploaded file URLs
  submittedAt: number;
  reviewedAt?: number;
  reviewedByAdminId?: string;
  rejectionReason?: string;
}

export type PaymentMode =
  | 'ki_escrow'   // Ki Business holds funds, transfers minus fees
  | 'own_keys'    // Consultant's own Stripe; owes 10% via Ki Wallet
  | 'ki_connect'  // Stripe Connect: auto-split at checkout
  | 'direct';     // Ki Business is the consultant; no platform fee

// ─── Marketplace Categories ──────────────────────────────────────────────────

export type MarketplaceCategory =
  | 'accounting_tax'
  | 'law_corporate'
  | 'immigration_visa'
  | 'financial_investment'
  | 'customs_trade'
  | 'trademark_ip';

// ─── KYC ────────────────────────────────────────────────────────────────────

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface KycDocument {
  type: string;
  url: string;
  uploaded_at: number;
}

export interface KycSubmission {
  uid: string;
  user_type: 'consultant' | 'client';
  documents: KycDocument[];
  status: KycStatus;
  stripe_identity_session_id?: string;
  rejection_reason?: string;
  submitted_at: number;
  reviewed_at?: number;
  reviewer_uid?: string;
}

// ─── Availability ────────────────────────────────────────────────────────────

export interface DayAvailability {
  enabled: boolean;
  start: string;  // "09:00"
  end: string;    // "18:00"
}

export interface WeeklyAvailability {
  monday:    DayAvailability;
  tuesday:   DayAvailability;
  wednesday: DayAvailability;
  thursday:  DayAvailability;
  friday:    DayAvailability;
  saturday:  DayAvailability;
  sunday:    DayAvailability;
}

// ─── Stripe Settings ────────────────────────────────────────────────────────

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

export interface KiStripePosSlot {
  id: string;
  label: string;
  isActive: boolean;
  publishable_key_encrypted?: string;
  publishable_key_iv?: string;
  publishable_key_authTag?: string;
  secret_key_encrypted?: string;
  secret_key_iv?: string;
  secret_key_authTag?: string;
  webhook_secret_encrypted?: string;
  webhook_secret_iv?: string;
  webhook_secret_authTag?: string;
  created_at: number;
  updated_at: number;
}

export interface PlatformSettings {
  ki_stripe_pos?: KiStripePosSlot[];
}

// ─── Calendar Integrations ──────────────────────────────────────────────────

export interface CalendarIntegration {
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

// ─── Consultant Profile ──────────────────────────────────────────────────────

export interface ConsultantProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;

  // Marketplace display
  photo_url?: string;
  title?: string;
  bio?: string;
  expertise?: string;
  location?: string;
  languages: string[];
  categories: MarketplaceCategory[];
  sub_specialties: string[];
  hourly_rate_cents: number;
  rating: number;
  review_count: number;

  // Special flags
  is_ki_business?: boolean;

  // Payment configuration
  payment_mode: PaymentMode;
  stripe_connect_account_id?: string;
  platform_fee_owed_cents?: number;
  ki_wallet_cents: number;           // Mode B: must cover 10% fee per booking

  // KYC
  kyc_status: KycStatus;
  kyc_fee_paid: boolean;
  stripe_identity_session_id?: string;
  kyc_rejection_reason?: string;

  // Integrations
  stripe_settings: StripeSettings;
  calendar_integration: CalendarIntegration;
  outlook_calendar: OutlookCalendarIntegration;
  availability?: WeeklyAvailability;
  meet_link?: string;

  // Meta
  timezone?: string;
  onboarding_status?: 'email_pending' | 'form_pending' | 'complete';
  created_at: number;
  updated_at: number;
}

// ─── Client (User) Profile ───────────────────────────────────────────────────

export interface ClientProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  address?: string;
  timezone: string;
  kyc_status: KycStatus;
  kyc_documents?: KycDocument[];
  created_at: number;
  updated_at: number;
}

// ─── Public Consultant Info (for marketplace) ────────────────────────────────

export interface PublicConsultantInfo {
  uid: string;
  name: string;
  title?: string;
  bio?: string;
  photo_url?: string;
  categories: MarketplaceCategory[];
  sub_specialties: string[];
  languages: string[];
  hourly_rate_cents: number;
  rating: number;
  review_count: number;
  location?: string;
  kyc_status: KycStatus;
  is_ki_business?: boolean;
}

// ─── Appointments ────────────────────────────────────────────────────────────

export interface AppointmentMetadata {
  consultant_id: string;
  customer_email: string;
  customer_name?: string;
  appointment_date: string;
  appointment_time: string;
  appointment_timezone?: string;
  package_id: string;
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
  meet_link?: string;
  calendar_event_ids?: { primary?: string; outlook?: string };
  created_at: number;
  updated_at: number;
  payment_amount: number;
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
  stripe_transfer_id?: string;
  meet_link?: string;
  stripe_fee_cents?: number;
  platform_fee_cents?: number;
  consultant_payout_cents?: number;
  payout_status?: 'pending' | 'paid' | 'na';
  onboarding_status: 'form_pending' | 'complete';
  created_at: number;
  updated_at: number;
}

// ─── Fees ────────────────────────────────────────────────────────────────────

export interface FeeBreakdown {
  gross_cents: number;
  stripe_fee_cents: number;
  net_cents: number;
  platform_fee_cents: number;
  consultant_payout_cents: number;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  appointment_id: string;
  consultant_id: string;
  client_uid: string;
  client_name: string;
  rating: number;       // 1-5
  comment: string;
  created_at: number;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export type WalletTransactionType =
  | 'topup_stripe'
  | 'topup_bank'
  | 'deduction_platform_fee'
  | 'escrow_hold'
  | 'escrow_release'
  | 'escrow_refund'
  | 'consulting_expense'
  | 'payout'
  | 'refund'
  | 'adjustment'
  | 'kyc_fee';

export interface WalletTransaction {
  id: string;
  user_id: string;
  amount_cents: number;
  direction: 'credit' | 'debit';
  type: WalletTransactionType;
  appointment_id?: string;
  escrow_id?: string;
  stripe_session_id?: string;
  note?: string;
  created_at: number;
}

// ─── Escrow ──────────────────────────────────────────────────────────────────

export type EscrowStatus =
  | 'holding'       // standard 15-day hold
  | 'held_for_kyc'  // blocked until consultant KYC verified
  | 'released'
  | 'refunded'
  | 'disputed';

export interface EscrowRecord {
  id: string;
  appointment_id: string;
  consultant_id: string;
  client_uid?: string;
  amount_cents: number;
  platform_fee_cents: number;
  consultant_payout_cents: number;
  status: EscrowStatus;
  kyc_required: boolean;
  release_at: number;   // epoch ms — 15 days after booking
  released_at?: number;
  refunded_at?: number;
  created_at: number;
  updated_at: number;
}

// ─── Wallet Summary ──────────────────────────────────────────────────────────

export interface WalletSummary {
  user_id: string;
  available_cents: number;
  held_cents: number;
  total_earned_cents: number;
  total_spent_cents: number;
  last_updated: number;
}

// ─── Tickets ─────────────────────────────────────────────────────────────────

export type TicketType     = 'marketplace' | 'ki_business' | 'technical';
export type TicketStatus   = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketMessage {
  id: string;
  sender_uid: string;
  sender_name: string;
  sender_role: 'user' | 'admin';
  content: string;
  created_at: number;
}

export interface Ticket {
  id: string;
  type: TicketType;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  user_id: string;
  user_email: string;
  assigned_to?: string;
  messages: TicketMessage[];
  created_at: number;
  updated_at: number;
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

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

// ─── Consultant Listings ──────────────────────────────────────────────────────

export type PricingType =
  | 'hourly'
  | 'per_session'
  | 'monthly_retainer'
  | 'yearly_retainer'
  | 'project_based'
  | 'package';

export type ListingCurrency = 'usd' | 'eur' | 'gbp' | 'try';
export type ListingPaymentMethod = 'card' | 'bank_transfer';

export interface ReferenceCase {
  title: string;
  description: string;
  outcome?: string;
}

export interface ListingPricing {
  type: PricingType;
  amount_cents: number;
  currency: ListingCurrency;
  hours_included?: number;
  sessions_included?: number;
  custom_note?: string;
  payment_methods: ListingPaymentMethod[];
}

// ─── Time Credits (Saat Kredisi) ─────────────────────────────────────────────

export type TimeCreditStatus = 'available' | 'used' | 'expired';

export interface TimeCredit {
  id: string;
  client_uid: string;
  consultant_id: string;
  listing_id: string;
  total_minutes: number;
  used_minutes: number;
  remaining_minutes: number;
  appointment_ids: string[];
  status: TimeCreditStatus;
  purchased_at: number;
  expires_at?: number;
}

export interface BookingSlot {
  date: string;
  time: string;
  available: boolean;
  bookedBy?: string;
}

export interface ConsultantListing {
  id: string;
  consultant_id: string;
  consultant_name?: string;
  category: MarketplaceCategory;
  specialty_id: string;
  specialty_label: string;
  title: string;
  description: string;
  references: ReferenceCase[];
  pricing: ListingPricing;
  requires_kyc: boolean;
  requires_contract: boolean;
  is_active: boolean;
  intro_price_cents?: number;
  intro_duration_minutes?: number;
  created_at: number;
  updated_at: number;
}
