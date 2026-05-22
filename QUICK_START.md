# 🚀 Marketplace Implementation Quick Start

**Estimated Setup Time: 2-3 hours**

## Step 1: Prepare Environment (15 minutes)

### 1.1 Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.2 Copy Environment Template
```bash
cp .env.marketplace.example .env.local
```

### 1.3 Add to `.env.local`
```env
# Generated in step 1.1
ENCRYPTION_KEY=your_32_char_hex_key_here

# OAuth credentials (get from Google Cloud Console & Azure)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...

# Rest should already be configured
```

---

## Step 2: Database Schema Setup (30 minutes)

### 2.1 Create Migration Script
```bash
# Create file: scripts/migrate-marketplace.js
cat > scripts/migrate-marketplace.js << 'EOF'
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

async function migrate() {
  console.log('Starting marketplace migration...');
  
  // Add marketplace fields to existing users
  const usersSnapshot = await db.collection('users').get();
  let updated = 0;
  
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    if (!data.stripe_settings) {
      await doc.ref.update({
        role: data.role || 'consultant',
        stripe_settings: { is_active: false },
        google_calendar: { connected: false },
        outlook_calendar: { connected: false },
        updated_at: Date.now()
      });
      updated++;
    }
  }
  
  console.log(`✅ Updated ${updated} users`);
}

migrate().catch(console.error);
EOF
```

### 2.2 Run Migration
```bash
node scripts/migrate-marketplace.js
```

### 2.3 Apply Firestore Security Rules

Go to [Firebase Console](https://console.firebase.google.com) → Firestore → Rules

Replace with rules from [MARKETPLACE_ARCHITECTURE.md](./MARKETPLACE_ARCHITECTURE.md#firestore-security-rules)

```bash
# Or use Firebase CLI
firebase deploy --only firestore:rules
```

---

## Step 3: Install Dependencies (5 minutes)

```bash
npm install axios
```

Already installed (check `package.json`):
- ✅ firebase
- ✅ firebase-admin
- ✅ @stripe/stripe-js
- ✅ stripe
- ✅ nodemailer

---

## Step 4: Update Existing Files (20 minutes)

### Option A: Gradual Migration (Recommended)

Keep both old and new routes running in parallel:

**Old routes** (unchanged):
- `/api/checkout/session/route.ts` - keeps working
- `/api/stripe/webhook/route.ts` - keeps working

**New routes** (add parallel):
- `/api/checkout/session/route-marketplace.ts`
- `/api/stripe/webhook/route-marketplace.ts`

Frontend will use new routes when `consultantId` is provided.

### Option B: Full Migration (Breaking Change)

Replace old files when ready:
```bash
mv src/app/api/checkout/session/route-marketplace.ts src/app/api/checkout/session/route.ts
mv src/app/api/stripe/webhook/route-marketplace.ts src/app/api/stripe/webhook/route.ts
```

---

## Step 5: Test Locally (30 minutes)

### 5.1 Start Dev Server
```bash
npm run dev
```

### 5.2 Test Encryption
```bash
# Node REPL
node -e "
const { encryptSensitiveData, decryptSensitiveData } = require('./src/lib/encryption');
const key = 'sk_test_123';
const enc = encryptSensitiveData(key);
console.log('Original:', key);
console.log('Encrypted:', enc.encryptedData);
const dec = decryptSensitiveData(enc.encryptedData, enc.iv, enc.authTag);
console.log('Decrypted:', dec);
console.log('Match:', dec === key ? '✅' : '❌');
"
```

### 5.3 Create Test Consultant
```bash
# In Firebase Console:
# 1. Go to Authentication → Create new user
#    - Email: consultant@example.com
#    - Password: TestPass123
#
# 2. Go to Firestore → users → consultant_uid → Edit
#    - role: "consultant"
#    - stripe_settings: { is_active: false }
#    - google_calendar: { connected: false }
#    - outlook_calendar: { connected: false }
```

### 5.4 Set Up Admin User
```bash
# In Node.js context:
import { setAdminClaim } from '@/lib/migration';
await setAdminClaim('your_uid', true);
```

Or via Firebase CLI:
```bash
firebase auth:set-custom-claims your_uid --admin true
```

### 5.5 Test Checkout Flow

**Using curl:**
```bash
curl -X POST http://localhost:3000/api/checkout/session \
  -H "Content-Type: application/json" \
  -d '{
    "consultantId": "consultant_uid",
    "packageId": "starter",
    "customerEmail": "customer@example.com",
    "customerName": "Test Customer",
    "appointmentDate": "2024-05-25",
    "appointmentTime": "10:00",
    "appointmentTimezone": "America/New_York"
  }'
```

**Or in browser console:**
```javascript
const response = await fetch('/api/checkout/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    consultantId: 'consultant_uid',
    packageId: 'starter',
    customerEmail: 'test@example.com',
    appointmentDate: '2024-05-25',
    appointmentTime: '10:00'
  })
});
const data = await response.json();
console.log(data); // Should have sessionId & appointmentId
```

---

## Step 6: Configure Consultants (30 minutes per consultant)

### 6.1 Get Consultant's Stripe Credentials

**Consultant must:**
1. Log in to Stripe Dashboard
2. Go Settings → API Keys → Reveal Secret Key
3. Copy `sk_live_...` (or `sk_test_...` for testing)

### 6.2 Get Webhook Secret

**Consultant must:**
1. Go to Webhooks → Add Endpoint
2. URL: `https://your-app.com/api/stripe/webhook`
3. Events: `checkout.session.completed`
4. Copy Signing Secret `whsec_...`

### 6.3 Admin Updates Consultant Settings

```bash
curl -X POST https://your-app.com/api/admin/consultant-settings \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_stripe",
    "consultant_id": "consultant_uid",
    "api_key": "sk_live_...",
    "webhook_secret": "whsec_..."
  }'
```

### 6.4 (Optional) Connect Google Calendar

If consultant wants calendar integration:

1. Consultant logs in to your app
2. Settings → Google Calendar → Authorize
3. System stores encrypted refresh token

Or admin manually:
```bash
curl -X POST https://your-app.com/api/admin/consultant-settings \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_google",
    "consultant_id": "consultant_uid",
    "refresh_token": "google_refresh_token...",
    "calendar_id": "primary@gmail.com"
  }'
```

---

## Step 7: Deploy to Netlify (15 minutes)

### 7.1 Update `netlify.toml` (if needed)

Already configured, but verify:
```toml
[build]
  command = "npm run build"
  publish = ".next"
  functions = "netlify/functions"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### 7.2 Set Environment Variables in Netlify

Go to Netlify Dashboard → Site Settings → Build & Deploy → Environment

Add all variables from `.env.local`:
```
ENCRYPTION_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
FIREBASE_SERVICE_ACCOUNT_KEY=...
NEXT_PUBLIC_FIREBASE_*=...
STRIPE_SECRET_KEY=... (platform, optional)
STRIPE_WEBHOOK_SECRET=... (platform, optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_APP_URL=https://your-app.netlify.app
SMTP_*=...
```

### 7.3 Deploy

```bash
# Using Netlify CLI
netlify deploy --prod

# Or via Git push (if connected)
git push origin main
```

---

## 🧪 Post-Deployment Validation

### Checklist

- [ ] Encryption working (keys stored encrypted)
- [ ] Consultant A can make checkout
- [ ] Consultant A's webhook fires
- [ ] Appointment status updated to confirmed
- [ ] Calendar event created (if configured)
- [ ] Confirmation email sent
- [ ] Consultant B's data not accessible to Consultant A
- [ ] Admin panel works
- [ ] Logs show no errors

### Test URLs

```
Development: http://localhost:3000
Staging: https://your-app-staging.netlify.app
Production: https://your-app.netlify.app
```

---

## 📚 Documentation Links

- [Full Architecture Guide](./MARKETPLACE_ARCHITECTURE.md)
- [Security & Testing Checklist](./TESTING_VALIDATION.md)
- [API Endpoints Reference](#api-endpoints)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Google Calendar API](https://developers.google.com/calendar/api/v3/reference)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/api/user-post-events)

---

## 🆘 Troubleshooting

### "ENCRYPTION_KEY not set"

```bash
# Add to .env.local
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### "Firestore document not found"

```bash
# Check Firestore structure:
# 1. Go to Firebase Console → Firestore
# 2. Should see: collections/users/{uid}/...
# 3. Run migration script from Step 2.2
```

### "Webhook signature verification failed"

```bash
# Verify:
# 1. Consultant's webhook_secret is correct (from Stripe dashboard)
# 2. Webhook URL is exactly: https://your-app.com/api/stripe/webhook
# 3. Events selected: checkout.session.completed
```

### "Stripe key invalid"

```bash
# In admin settings:
# 1. Get new API key from Stripe dashboard
# 2. POST to /api/admin/consultant-settings with action: "update_stripe"
# 3. Verify encryption key is set (ENCRYPTION_KEY env var)
```

### Calendar events not syncing

```bash
# Check:
# 1. Google/Outlook calendar is connected (in admin panel)
# 2. Refresh token is valid (>10 days old)
# 3. Consultant has granted calendar.write permission
# 4. Check server logs for calendar sync errors
```

---

## ✅ Success Criteria

Your marketplace is ready when:

1. ✅ Multiple consultants can create independent checkouts
2. ✅ Each uses their own Stripe account (different API keys)
3. ✅ Webhooks correctly route to each consultant
4. ✅ Appointments sync to consultant's calendar
5. ✅ Customers receive confirmation emails
6. ✅ No cross-contamination between consultants
7. ✅ Admin can manage all integrations
8. ✅ All sensitive data encrypted
9. ✅ Graceful error handling (no 500 errors on failures)
10. ✅ Monitoring & logging configured

---

## 🎉 Next Steps After Launch

1. **Monitor**: Watch logs for first 48 hours
2. **Communicate**: Notify consultants of new dashboard
3. **Train**: Run onboarding session for consultants
4. **Feedback**: Collect feedback from users
5. **Iterate**: Plan Phase 2 features (commission management, analytics, etc.)

---

**Questions? Check the [Architecture Guide](./MARKETPLACE_ARCHITECTURE.md) or reach out to the team.**
