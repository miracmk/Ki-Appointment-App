# Ki Business Solutions Customer Portal

A customer portal and appointment booking system built with Next.js, Stripe Checkout, and Firebase Auth / Firestore.

## Features

- Client portal for logged-in users
- Stripe Checkout integration for purchasing consultation packages
- Automatic user creation on successful payment
- Random password generation and email confirmation
- Appointment tracking and document delivery
- Admin portal for viewing appointments and assigning package PDFs

## Prerequisites

- Node.js 18+
- npm
- Stripe account
- Firebase project with Firestore and Authentication enabled
- SMTP credentials for sending confirmation emails

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd "Ki Appointment App"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file based on `.env.example`:
   ```bash
   copy .env.example .env.local
   ```

4. Update `.env.local` with your Stripe, Firebase, and SMTP settings.

## Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Build

Create a production build:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Netlify Deployment

This repository uses Netlify with `@netlify/plugin-nextjs` configured in `netlify.toml`.
Make sure the site is connected to the `main` branch and that all required environment variables are configured in Netlify.

Netlify will publish the `.next` output directory and run `npm run build` during deploy.

## Important Notes

- `NEXT_PUBLIC_FIREBASE_*` values are used by the client for auth.
- `FIREBASE_SERVICE_ACCOUNT_KEY` must contain the service account JSON as a single-line JSON string.
- `STRIPE_WEBHOOK_SECRET` is required for secure webhook handling.
- `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` are used to send confirmation emails.
- `NEXT_PUBLIC_ADMIN_EMAILS` controls who can access the admin portal.

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── checkout/
│   │   └── stripe/
│   ├── admin/
│   ├── checkout/
│   ├── dashboard/
│   ├── login/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── navbar.tsx
│   ├── hero.tsx
│   ├── services.tsx
│   ├── pricing.tsx
│   ├── pricing/
│   │   └── stripe-checkout.tsx
│   ├── about.tsx
│   ├── process.tsx
│   ├── testimonials.tsx
│   ├── call-to-action.tsx
│   └── footer.tsx
├── lib/
│   ├── firebase-admin.ts
│   ├── firebase-client.ts
│   └── utils.ts
└── public/
    └── documents/
```

## Portal Flows

- Users choose a package and proceed to Stripe Checkout from the Consultations section.
- After successful payment, Stripe webhook triggers user creation and appointment storage.
- Users receive an email with their login credentials and can sign into `/login`.
- The dashboard shows appointments and assigned documents.
- Admin users can access `/admin` to view all appointments and assign PDF resources.
