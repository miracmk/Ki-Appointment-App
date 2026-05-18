# Marketplace Architecture Implementation Guide

## 🏗️ System Overview

This guide walks through converting Ki Appointment App from a single-consultant system to a multi-vendor marketplace where:
- Each consultant manages their own Stripe account
- Appointments sync to consultant's Google/Outlook calendar
- Secure encryption for all API keys
- Centralized webhook handling with dynamic routing
- Admin panel for managing all consultant integrations

## 📋 File Structure Overview

```
src/
├── lib/
│   ├── encryption.ts                 # AES-256 encryption for API keys
│   ├── marketplace.ts                # Consultant data management
│   ├── calendar-sync.ts              # Google/Outlook calendar integration
│   ├── consultant-settings.ts        # Settings management utilities
│   └── (existing files...)
├── types/
│   ├── marketplace.ts                # Type definitions for marketplace schema
│   └── (existing files...)
├── app/
│   └── api/
│       ├── checkout/
│       │   └── session/
│       │       ├── route.ts          # KEEP: Original (backward compatibility)
│       │       └── route-marketplace.ts  # NEW: Dynamic Stripe checkout
│       ├── stripe/
│       │   └── webhook/
│       │       ├── route.ts          # KEEP: Original (backward compatibility)
│       │       └── route-marketplace.ts  # NEW: Dynamic webhook routing
│       └── admin/
│           └── consultant-settings/
│               └── route.ts          # NEW: Admin settings management
```

## 🔐 Security Architecture

### Data Encryption Strategy

**Problem**: Storing Stripe API keys, webhook secrets, and OAuth refresh tokens in plaintext is a security risk.

**Solution**: AES-256-GCM authenticated encryption

```typescript
// Encryption at storage time
const { encryptedData, iv, authTag } = encryptSensitiveData(apiKey);
// Store: { api_key_encrypted, api_key_iv, api_key_authTag }

// Decryption at runtime (only when needed)
const apiKey = decryptSensitiveData(encryptedData, iv, authTag);
```

**Firestore Schema** (encrypted fields stored alongside originals):
```json
{
  "users": {
    "consultant-uid": {
      "stripe_settings": {
        "api_key_encrypted": "...",
        "api_key_iv": "...",
        "api_key_authTag": "...",
        "webhook_secret_encrypted": "...",
        "webhook_secret_iv": "...",
        "webhook_secret_authTag": "...",
        "is_active": true
      }
    }
  }
}
```

## 🔄 Request Flow (Before vs After)

### OLD FLOW (Single Consultant)
```
Client Request
    ↓
POST /api/checkout/session
    ↓
Use process.env.STRIPE_SECRET_KEY
    ↓
Create Stripe Session
    ↓
Return sessionId
    ↓
Webhook hits /api/stripe/webhook
    ↓
Use process.env.STRIPE_WEBHOOK_SECRET to verify
    ↓
Create Appointment
```

### NEW FLOW (Multi-Vendor Marketplace)
```
Client Request (with consultantId)
    ↓
POST /api/checkout/session
    ↓
Extract consultantId from request
    ↓
Firestore: Get consultant's encrypted Stripe API key
    ↓
Decrypt API key at runtime
    ↓
Create Stripe instance dynamically: new Stripe(consultant_api_key)
    ↓
Create Session with metadata { consultant_id, appointment_id }
    ↓
Store appointment in Firestore
    ↓
Return sessionId + appointmentId
    ↓
After payment...
    ↓
Webhook hits /api/stripe/webhook (shared across ALL consultants)
    ↓
Extract consultant_id from session metadata
    ↓
Firestore: Get that consultant's encrypted webhook secret
    ↓
Decrypt webhook secret
    ↓
Verify signature: stripe.webhooks.constructEvent(payload, sig, consultant_secret)
    ↓
Update appointment status
    ↓
Async: Sync to Google Calendar (using refresh token)
    ↓
Async: Sync to Outlook Calendar (using refresh token)
    ↓
Send confirmation email with .ics attachment
```

## 🚀 Implementation Checklist

### Phase 1: Database Schema Migration

```firestore
// Initialize new collections for marketplace
db.collection('users').doc(uid).set({
  // Existing fields
  uid: string
  email: string
  name: string
  
  // New marketplace fields
  role: 'admin' | 'consultant'
  stripe_settings: {
    api_key_encrypted: string
    api_key_iv: string
    api_key_authTag: string
    webhook_secret_encrypted: string
    webhook_secret_iv: string
    webhook_secret_authTag: string
    is_active: boolean
  }
  google_calendar: {
    refresh_token_encrypted: string
    refresh_token_iv: string
    refresh_token_authTag: string
    access_token_encrypted: string
    access_token_iv: string
    access_token_authTag: string
    access_token_expiry: number
    connected: boolean
    calendar_id: string
  }
  outlook_calendar: {
    refresh_token_encrypted: string
    refresh_token_iv: string
    refresh_token_authTag: string
    access_token_encrypted: string
    access_token_iv: string
    access_token_authTag: string
    access_token_expiry: number
    connected: boolean
    calendar_id: string
  }
})

// New appointments collection (nested under consultant)
db.collection('consultants').doc(consultant_uid).collection('appointments').doc(appointment_id).set({
  consultant_id: string
  customer_email: string
  customer_name: string
  appointment_date: string (ISO 8601 UTC)
  appointment_time: string (HH:mm)
  appointment_timezone: string
  package_id: string
  stripe_session_id: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  calendar_event_ids: {
    google: string
    outlook: string
  }
  payment_amount: number
  created_at: number
  updated_at: number
})
```

### Phase 2: Deploy New API Routes

1. **Keep existing routes for backward compatibility**
   - `/api/checkout/session/route.ts` (original)
   - `/api/stripe/webhook/route.ts` (original)

2. **Deploy new marketplace routes**
   - Copy `route-marketplace.ts` to `route.ts` in each directory when ready
   - Or configure routing logic to use new endpoints when `consultantId` is present

### Phase 3: Encryption Key Setup

```bash
# Generate a secure 32-character encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
ENCRYPTION_KEY=your_generated_key_here
```

### Phase 4: Admin Settings Management

Only admins can configure consultant integrations:

```bash
curl -X POST http://localhost:3000/api/admin/consultant-settings \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_stripe",
    "consultant_id": "uid_of_consultant",
    "api_key": "sk_test_...",
    "webhook_secret": "whsec_..."
  }'
```

## 📊 Timezone Handling

**Problem**: Consultants and customers in different timezones need correct appointment times.

**Solution**: Always store in UTC, convert for display/calendar events.

```typescript
// From request (customer's timezone)
appointment_date: "2024-05-20"
appointment_time: "14:30"
appointment_timezone: "America/New_York"

// Stored in UTC
// When syncing to calendar, provide both UTC and timezone to calendar API
start: {
  dateTime: "2024-05-20T18:30:00Z",     // UTC
  timeZone: "America/New_York"          // Display in this timezone
}
```

## ✅ Testing & Validation Checklist

### [ ] Encryption Security
- [ ] Stripe API keys are encrypted before storage
- [ ] Decryption only happens at request time
- [ ] Same key cannot decrypt data with different IV/authTag
- [ ] Test key rotation plan (coming in Phase 2)

### [ ] Webhook Isolation
- [ ] Consultant A's payment doesn't affect Consultant B
- [ ] Webhook signature verified with correct consultant's secret
- [ ] Webhook returns 400 if signature invalid
- [ ] Webhook returns 200 even if calendar sync fails (graceful degradation)

### [ ] Timezone Synchronization
- [ ] Appointment stored in UTC
- [ ] Google Calendar receives UTC + timezone string
- [ ] Outlook Calendar receives UTC + timezone string
- [ ] Customer sees appointment in their local timezone
- [ ] Consultant sees appointment in their local timezone

### [ ] Token Resilience
- [ ] First appointment sync works (token fresh)
- [ ] Second appointment sync works 1 hour later (token expired, auto-refreshed)
- [ ] Refresh token rotation happens automatically
- [ ] If refresh token invalid, gracefully log and continue

### [ ] Error Handling
- [ ] If Stripe key invalid: Appointment status = 'pending', user informed
- [ ] If Google Calendar fails: Appointment confirmed, email sent, error logged
- [ ] If Outlook Calendar fails: Appointment confirmed, email sent, error logged
- [ ] If SMTP fails: Appointment confirmed, error logged (don't fail webhook)
- [ ] Webhook endpoint always returns 200 (except signature mismatch = 400)

### [ ] Admin Access
- [ ] Admin can create appointments for their own Stripe account
- [ ] Admin can assign appointments to specific consultants
- [ ] Admin can update consultant settings via API
- [ ] Admin can view all appointments across consultants
- [ ] Non-admin users cannot access admin endpoints

## 🔧 Gradual Migration Strategy

### Step 1: Deploy new code (non-breaking)
- Add new files: `route-marketplace.ts`, `encryption.ts`, `calendar-sync.ts`
- Keep existing routes working
- No changes to frontend yet

### Step 2: Test with new routes
- Consultants test `/api/checkout/session` with `consultantId` parameter
- Verify webhook handling works correctly
- Verify calendar sync works

### Step 3: Update frontend
- Modify checkout flow to include `consultantId`
- Update appointment UI to show calendar integration status

### Step 4: Cutover
- When confident, replace old `route.ts` with `route-marketplace.ts`
- Monitor webhook processing

## 📖 Admin Documentation Template

```markdown
## Setting Up a Consultant Integration

### 1. Get Stripe Credentials from Consultant
- Consultant logs into Stripe Dashboard
- Settings → API Keys → Reveal Test/Live Secret Key
- Webhooks → Add Endpoint → Point to your webhook URL
- Copy the Webhook Signing Secret

### 2. Get Google Calendar Refresh Token
- Consultant authorizes via OAuth flow
- System stores refresh token encrypted

### 3. Get Outlook Calendar Refresh Token
- Consultant authorizes via OAuth flow
- System stores refresh token encrypted

### 4. Register in Admin Panel
POST /api/admin/consultant-settings
With all encrypted credentials
```

## 🛑 Known Limitations & Future Work

1. **Idempotency**: Webhook could be called twice, creating duplicate appointments
   - **Fix**: Add idempotency key to session metadata

2. **Refresh Token Rotation**: Microsoft rotates refresh tokens sometimes
   - **Fix**: Handle 401 responses in calendar sync, mark as disconnected

3. **Timezone DST**: Daylight saving time transitions
   - **Fix**: Always use `timeZone` field in calendar API, not manual offsets

4. **Consultant Offboarding**: What happens when consultant is deleted?
   - **Fix**: Mark appointments as 'orphaned', allow reassignment to new consultant

5. **Audit Logging**: Who changed consultant settings?
   - **Fix**: Add audit log collection for compliance

## 🚨 Security Considerations

1. **Encryption Key Rotation**: Plan for rotating the main ENCRYPTION_KEY
2. **Access Logs**: Log all admin API calls to consultant-settings endpoint
3. **Token Expiry**: Implement monitoring for expired/invalid tokens
4. **API Key Leaks**: If key leaked, consultant can revoke in Stripe and update via admin
5. **Database Backups**: Encrypted data is safe, but ENCRYPTION_KEY must be backed up separately

---

## 📚 Reference Documentation Used

- Stripe API: https://stripe.com/docs/api/checkout/sessions/create
- Stripe Webhooks: https://stripe.com/docs/webhooks
- Google Calendar API: https://developers.google.com/calendar/api/v3/reference/events/insert
- Google OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
- Microsoft Graph Calendar: https://learn.microsoft.com/en-us/graph/api/user-post-events
- Microsoft OAuth: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- iCalendar Format: https://datatracker.ietf.org/doc/html/rfc5545
