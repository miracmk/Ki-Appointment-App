# API Endpoints Reference

## 🔄 Public Endpoints

### POST /api/checkout/session
**Create a Stripe checkout session for a consultant's appointment**

**Request:**
```json
{
  "consultantId": "uid_of_consultant",
  "packageId": "starter|growth|scale|executive",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "appointmentDate": "2024-05-25",
  "appointmentTime": "14:30",
  "appointmentTimezone": "America/New_York"
}
```

**Response (Success - 200):**
```json
{
  "sessionId": "cs_test_...",
  "appointmentId": "apt_..."
}
```

**Error Responses:**
- **400**: Missing required fields
- **400**: Invalid package ID
- **503**: Stripe not configured for consultant
- **500**: Other errors

**Key Implementation:**
- Gets consultant's Stripe API key (decrypted)
- Creates Stripe instance dynamically
- Stores appointment in Firestore
- Embeds consultantId in metadata

---

### POST /api/stripe/webhook
**Receives Stripe webhook events for all consultants**

**Request Headers:**
```
stripe-signature: t=timestamp,v1=signature
```

**Request Body:** Raw Stripe event payload

**Response (Success - 200):**
```json
{
  "received": true
}
```

**Error Responses:**
- **400**: Missing signature header
- **400**: Invalid JSON payload
- **400**: Webhook signature verification failed

**Key Implementation:**
- Extracts consultantId from metadata
- Gets consultant's webhook secret (decrypted)
- Verifies signature with consultant's secret
- Updates appointment status to "confirmed"
- Triggers async calendar syncs
- Sends confirmation email
- Always returns 200 except on signature mismatch

**Webhook Events Handled:**
- `checkout.session.completed` → Updates appointment, syncs calendar, sends email

---

## 🔐 Admin Endpoints

### POST /api/admin/consultant-settings
**Manage consultant integrations (admin only)**

**Authentication:**
```
Authorization: Bearer {ADMIN_ID_TOKEN}
```

**Admin Claim Check:**
```json
{
  "admin": true
}
```

#### Action: update_stripe
Configure Stripe for a consultant
```json
{
  "action": "update_stripe",
  "consultant_id": "uid_of_consultant",
  "api_key": "sk_live_...",
  "webhook_secret": "whsec_..."
}
```

Response: ✅ 200 OK
```json
{
  "success": true,
  "message": "Stripe settings updated"
}
```

**Security:**
- API key encrypted with AES-256-GCM
- Webhook secret encrypted with AES-256-GCM
- Encryption key from ENCRYPTION_KEY env var
- Only decrypted at runtime when needed

#### Action: update_google
Connect Google Calendar for a consultant
```json
{
  "action": "update_google",
  "consultant_id": "uid_of_consultant",
  "refresh_token": "1//0g...",
  "calendar_id": "primary@gmail.com"
}
```

Response: ✅ 200 OK
```json
{
  "success": true,
  "message": "Google Calendar settings updated"
}
```

**Notes:**
- Refresh token encrypted
- Calendar ID stored plaintext (not secret)
- System auto-refreshes access token on expiry

#### Action: update_outlook
Connect Outlook Calendar for a consultant
```json
{
  "action": "update_outlook",
  "consultant_id": "uid_of_consultant",
  "refresh_token": "M.R3_BAY..."
}
```

Response: ✅ 200 OK
```json
{
  "success": true,
  "message": "Outlook Calendar settings updated"
}
```

#### Action: disable_stripe
Disable Stripe for a consultant
```json
{
  "action": "disable_stripe",
  "consultant_id": "uid_of_consultant"
}
```

#### Action: disconnect_google
Disconnect Google Calendar for a consultant
```json
{
  "action": "disconnect_google",
  "consultant_id": "uid_of_consultant"
}
```

#### Action: disconnect_outlook
Disconnect Outlook Calendar for a consultant
```json
{
  "action": "disconnect_outlook",
  "consultant_id": "uid_of_consultant"
}
```

**Error Responses:**
- **401**: Missing or invalid auth token
- **403**: User is not admin
- **400**: Missing required fields
- **400**: Unknown action
- **500**: Database error

---

## 🔍 Data Flow Summary

### Checkout Flow
```
POST /api/checkout/session
  ├─ Extract { consultantId, packageId, ... }
  ├─ Validate inputs
  ├─ Fetch consultant profile from Firestore
  ├─ Decrypt consultant's Stripe API key
  ├─ Create Stripe instance: new Stripe(decrypted_key)
  ├─ Create appointment record
  ├─ Create checkout session with metadata
  └─ Return { sessionId, appointmentId }
```

### Webhook Flow
```
POST /api/stripe/webhook
  ├─ Extract raw payload + signature
  ├─ Parse JSON to get consultantId from metadata
  ├─ Fetch consultant profile from Firestore
  ├─ Decrypt consultant's webhook secret
  ├─ Verify signature: constructEvent(payload, sig, secret)
  ├─ Update appointment status → "confirmed"
  ├─ Async: Sync to Google Calendar
  │   ├─ Get refresh token (encrypted)
  │   ├─ Check if access token expired
  │   ├─ If expired: Auto-refresh using refresh token
  │   ├─ Create calendar event
  │   └─ Store event ID in appointment
  ├─ Async: Sync to Outlook Calendar (same flow)
  ├─ Send confirmation email with .ics attachment
  └─ Return 200 OK
```

### Calendar Sync Details
```
syncToGoogleCalendar(consultantId, appointment)
  ├─ Fetch consultant profile
  ├─ Check if Google Calendar connected
  ├─ Get access token (may be expired)
  ├─ If expired: Call refreshGoogleAccessToken()
  │   ├─ Use refresh token to get new access token
  │   ├─ Update consultant profile with new token + expiry
  │   └─ Return new access token
  ├─ Call Google Calendar API: Create event
  │   ├─ Start: { dateTime: ISO, timeZone: consultant_tz }
  │   ├─ End: 1 hour later
  │   ├─ Attendees: [customer_email]
  │   └─ Summary: "Consultation - {customer_name}"
  └─ Store event ID in appointment.calendar_event_ids.google
```

---

## 📝 Environment Variables

### Required for Marketplace
```env
# Encryption
ENCRYPTION_KEY=32-character-hex-key

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Microsoft OAuth
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
```

### Required (Already Configured)
```env
# Firebase
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
NEXT_PUBLIC_FIREBASE_*=...

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASSWORD=xxx

# App
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### Optional (Platform Stripe - if admin uses own account)
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🧪 Testing Endpoints

### Test Checkout
```bash
curl -X POST http://localhost:3000/api/checkout/session \
  -H "Content-Type: application/json" \
  -d '{
    "consultantId": "test_uid",
    "packageId": "starter",
    "customerEmail": "test@example.com",
    "appointmentDate": "2024-05-25",
    "appointmentTime": "14:00"
  }'
```

### Test Admin Settings
```bash
curl -X POST http://localhost:3000/api/admin/consultant-settings \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_stripe",
    "consultant_id": "test_uid",
    "api_key": "sk_test_...",
    "webhook_secret": "whsec_test_..."
  }'
```

### Simulate Webhook (using Stripe CLI)
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger test event
stripe trigger checkout.session.completed
```

---

## 📊 Request/Response Patterns

### Success Pattern
```json
{
  "success": true,
  "data": {...} or "message": "..."
}
```

### Error Pattern
```json
{
  "error": "Human-readable error message"
}
```

### Webhook Pattern
```json
{
  "received": true
}
```

---

## 🔐 Authentication Methods

| Endpoint | Auth Method | Check |
|----------|-------------|-------|
| `/api/checkout/session` | None (public) | Valid consultantId in Firestore |
| `/api/stripe/webhook` | Stripe Signature | HMAC-SHA256 verification |
| `/api/admin/consultant-settings` | Firebase ID Token | Must have `admin: true` custom claim |

---

## 🚀 Rate Limiting Recommendations

| Endpoint | Suggested Limit | Window |
|----------|-----------------|--------|
| `/api/checkout/session` | 100 | per hour per IP |
| `/api/stripe/webhook` | 1000 | per hour |
| `/api/admin/consultant-settings` | 50 | per hour |

---

## 📚 Related Documentation

- **Architecture:** [MARKETPLACE_ARCHITECTURE.md](./MARKETPLACE_ARCHITECTURE.md)
- **Testing:** [TESTING_VALIDATION.md](./TESTING_VALIDATION.md)
- **Quick Start:** [QUICK_START.md](./QUICK_START.md)
- **Implementation:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-05-18 | Initial marketplace implementation |

---

**Last Updated:** May 18, 2026  
**Status:** ✅ Ready for Implementation
