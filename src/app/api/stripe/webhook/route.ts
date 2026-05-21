import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import {
  getConsultantWebhookSecret,
  getConsultantStripeApiKey,
  getAppointment,
  updateAppointmentStatus,
  getConsultantProfile,
  calculateFees,
} from '@/lib/marketplace';
import { syncToCalendar, syncToOutlookCalendar, generateICS } from '@/lib/calendar-sync';
import { createVideoCallLink } from '@/lib/video-call';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { getActiveKiStripePosConfig } from '@/lib/stripe-pos';
import { AppointmentMetadata, Appointment, FlatAppointment, PaymentMode } from '@/types/marketplace';
import nodemailer from 'nodemailer';

const pricingMap: Record<string, { amount: number; name: string }> = {
  starter: { amount: 20000, name: 'Starter' },
  growth: { amount: 100000, name: 'Growth' },
  scale: { amount: 500000, name: 'Scale' },
  executive: { amount: 1000000, name: 'Executive' },
};

function formatDate(isoDate: string, time: string, timezone: string): string {
  try {
    const dt = new Date(isoDate);
    return dt.toLocaleDateString('tr-TR', {
      timeZone: timezone || 'UTC',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }) + ' ' + time + ' (' + (timezone || 'UTC') + ')';
  } catch {
    return `${isoDate} ${time}`;
  }
}

async function ensureFirebaseUser(
  email: string,
  displayName: string
): Promise<{ uid: string; isNew: boolean }> {
  const auth = getAdminAuth();
  try {
    const existing = await auth.getUserByEmail(email);
    return { uid: existing.uid, isNew: false };
  } catch {
    const newUser = await auth.createUser({ email, displayName: displayName || '', emailVerified: false });
    return { uid: newUser.uid, isNew: true };
  }
}

async function writeFlatAppointment(
  appointmentId: string,
  appointment: Appointment,
  consultantName: string,
  stripeSessionId: string,
  paymentMode: PaymentMode
): Promise<void> {
  const db = getAdminFirestore();
  const fees = calculateFees(appointment.payment_amount);

  const record: Omit<FlatAppointment, 'id'> = {
    consultant_id: appointment.consultant_id,
    consultant_name: consultantName,
    customer_email: appointment.customer_email,
    customer_name: appointment.customer_name || '',
    appointment_date: appointment.appointment_date,
    appointment_time: appointment.appointment_time,
    appointment_timezone: appointment.appointment_timezone || 'UTC',
    package_id: appointment.package_id,
    package_name: pricingMap[appointment.package_id]?.name || appointment.package_id,
    status: 'confirmed',
    payment_amount: appointment.payment_amount,
    payment_mode: paymentMode,
    stripe_session_id: stripeSessionId,
    stripe_fee_cents: fees.stripe_fee_cents,
    platform_fee_cents: fees.platform_fee_cents,
    consultant_payout_cents: fees.consultant_payout_cents,
    payout_status: paymentMode === 'ki_escrow' ? 'pending' : 'na',
    onboarding_status: 'form_pending',
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  await db.collection('appointments').doc(appointmentId).set(record);
}

async function sendConfirmationEmail(
  to: string,
  consultantEmail: string,
  consultantName: string,
  appointment: Appointment,
  icsContent: string,
  passwordResetLink: string | null
): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const emailFrom = process.env.EMAIL_FROM || 'Ki Business Solutions <no-reply@kibusiness.co>';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.warn('SMTP not configured; confirmation email skipped.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPassword },
  });

  const appointmentDisplay = formatDate(
    appointment.appointment_date,
    appointment.appointment_time,
    appointment.appointment_timezone || 'UTC'
  );
  const packageName = pricingMap[appointment.package_id]?.name || appointment.package_id;
  const onboardingUrl = `${appUrl}/onboarding`;

  const portalSection = passwordResetLink
    ? `\n\n=== CLIENT PORTAL ===\nActivate your portal account to view your appointment and documents:\n${passwordResetLink}\n\nThis link is valid for 24 hours.`
    : `\n\n=== CLIENT PORTAL ===\nSign in with your existing account:\n${appUrl}/login`;

  const mailBody = `Hello${appointment.customer_name ? ' ' + appointment.customer_name : ''},

Your appointment has been confirmed!

Consultant : ${consultantName} (${consultantEmail})
Package    : ${packageName}
Date/Time  : ${appointmentDisplay}
${portalSection}

=== NEXT STEP ===
To start your consulting process, please fill in a short onboarding form at the link below:
${onboardingUrl}

You can add the attached .ics file to your calendar.

For any questions, feel free to contact your consultant directly.

Best regards,
Ki Business Solutions`;

  await transporter.sendMail({
    from: emailFrom,
    to,
    subject: 'Appointment Confirmed – Ki Business Solutions',
    text: mailBody,
    icalEvent: {
      filename: 'appointment.ics',
      method: 'REQUEST',
      content: icsContent,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing Stripe-Signature header.' }, { status: 400 });
    }

    // Parse raw JSON to read payment_mode from metadata before signature check
    let rawEvent: any;
    try {
      rawEvent = JSON.parse(payload);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const session = rawEvent.data?.object;
    const metadata = session?.metadata as AppointmentMetadata | undefined;

    if (!metadata?.consultant_id) {
      console.error('Stripe metadata missing consultant_id:', metadata);
      return NextResponse.json({ error: 'Missing consultant_id.' }, { status: 400 });
    }

    const consultantId = metadata.consultant_id;
    const paymentMode = (metadata.payment_mode ?? 'own_keys') as PaymentMode;

    // Choose webhook secret and Stripe key based on payment mode
    let webhookSecret: string | null = null;
    let stripeApiKey: string | null = null;

    if (paymentMode === 'own_keys') {
      const [consultantWebhookSecret, consultantApiKey] = await Promise.all([
        getConsultantWebhookSecret(consultantId),
        getConsultantStripeApiKey(consultantId),
      ]);
      webhookSecret = consultantWebhookSecret;
      stripeApiKey = consultantApiKey;
    } else {
      // ki_escrow, ki_connect, direct → use platform keys
      const activeConfig = await getActiveKiStripePosConfig();
      webhookSecret = activeConfig.webhookSecret;
      stripeApiKey = activeConfig.secretKey;
    }

    if (!webhookSecret) {
      console.error(`Webhook secret not found (mode=${paymentMode}, consultant=${consultantId})`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(stripeApiKey || 'placeholder', { apiVersion: '2023-10-16' });
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed (${consultantId}):`, err);
      return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const sessionObj   = event.data.object as Stripe.Checkout.Session;
      const eventMetadata = sessionObj.metadata as unknown as AppointmentMetadata & { type?: string };

      // ── KYC fee paid ─────────────────────────────────────────────────
      if (eventMetadata.type === 'kyc_fee') {
        const db = getAdminFirestore();
        await db.collection('users').doc(consultantId).update({
          kyc_fee_paid: true,
          kyc_status:   'pending',
          updated_at:   Date.now(),
        });
        await db.collection('kyc_submissions').doc(consultantId).set(
          { uid: consultantId, status: 'pending', submitted_at: Date.now() },
          { merge: true }
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // ── Wallet top-up ─────────────────────────────────────────────────
      if (eventMetadata.type === 'wallet_topup') {
        const db          = getAdminFirestore();
        const amountCents = sessionObj.amount_total ?? 0;
        await db.runTransaction(async (tx) => {
          const ref  = db.collection('users').doc(consultantId);
          const snap = await tx.get(ref);
          const cur  = (snap.data()?.ki_wallet_cents as number) ?? 0;
          tx.update(ref, { ki_wallet_cents: cur + amountCents, updated_at: Date.now() });
          tx.set(db.collection('wallet_transactions').doc(), {
            user_id:           consultantId,
            amount_cents:      amountCents,
            direction:         'credit',
            type:              'topup_stripe',
            stripe_session_id: sessionObj.id,
            created_at:        Date.now(),
          });
        });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const appointmentId = eventMetadata.session_id ?? (eventMetadata as { appointment_id?: string }).appointment_id;

      if (!appointmentId) {
        console.error('Webhook metadata missing appointment ID', eventMetadata);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      try {
        const appointment = await getAppointment(consultantId, appointmentId);
        if (!appointment) {
          console.error(`Appointment not found: ${appointmentId}`);
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const consultant = await getConsultantProfile(consultantId);
        if (!consultant) {
          console.error(`Consultant profile not found: ${consultantId}`);
          return NextResponse.json({ received: true }, { status: 200 });
        }

        await updateAppointmentStatus(consultantId, appointmentId, 'confirmed');

        // ── Mode B: deduct platform fee from Ki Wallet ────────────────
        if (paymentMode === 'own_keys') {
          const fees = calculateFees(appointment.payment_amount);
          const db   = getAdminFirestore();
          await db.runTransaction(async (tx) => {
            const ref  = db.collection('users').doc(consultantId);
            const snap = await tx.get(ref);
            const cur  = (snap.data()?.ki_wallet_cents as number) ?? 0;
            tx.update(ref, { ki_wallet_cents: Math.max(0, cur - fees.platform_fee_cents), updated_at: Date.now() });
            tx.set(db.collection('wallet_transactions').doc(), {
              user_id:        consultantId,
              amount_cents:   fees.platform_fee_cents,
              direction:      'debit',
              type:           'deduction_platform_fee',
              appointment_id: appointmentId,
              created_at:     Date.now(),
            });
          });
        }

        await writeFlatAppointment(
          appointmentId,
          { ...appointment, id: appointmentId },
          consultant.name,
          sessionObj.id,
          paymentMode
        );

        // ── Escrow record + wallet transactions ────────────────────────
        try {
          const db = getAdminFirestore();
          const fees = calculateFees(appointment.payment_amount);
          // KYC required if booking > $1,000 and consultant is not admin-verified
          const consultantIsVerified = consultant.kyc_status === 'verified';
          const KYC_THRESHOLD = 100_000;
          const kycRequired = appointment.payment_amount > KYC_THRESHOLD && !consultantIsVerified;
          const now      = Date.now();
          const escrowRef = db.collection('escrow_records').doc();
          const escrowId  = escrowRef.id;

          let clientUid: string | undefined;
          try {
            const clientUser = await getAdminAuth().getUserByEmail(eventMetadata.customer_email);
            clientUid = clientUser.uid;
          } catch { /* client not yet created */ }

          await escrowRef.set({
            appointment_id:          appointmentId,
            consultant_id:           consultantId,
            client_uid:              clientUid ?? null,
            amount_cents:            appointment.payment_amount,
            platform_fee_cents:      fees.platform_fee_cents,
            consultant_payout_cents: fees.consultant_payout_cents,
            status:     kycRequired ? 'held_for_kyc' : 'holding',
            kyc_required: kycRequired,
            release_at:   now + 15 * 24 * 60 * 60 * 1000,
            created_at:   now,
            updated_at:   now,
          });

          await db.collection('wallet_transactions').doc().set({
            user_id:        consultantId,
            amount_cents:   fees.consultant_payout_cents,
            direction:      'debit',
            type:           'escrow_hold',
            appointment_id: appointmentId,
            escrow_id:      escrowId,
            note: kycRequired ? 'Held pending KYC verification' : '15-day escrow hold',
            created_at: now,
          });

          if (clientUid) {
            await db.collection('wallet_transactions').doc().set({
              user_id:        clientUid,
              amount_cents:   appointment.payment_amount,
              direction:      'debit',
              type:           'consulting_expense',
              appointment_id: appointmentId,
              escrow_id:      escrowId,
              note:           'Consulting session booked',
              created_at:     now,
            });
          }
        } catch (escrowErr) {
          console.error('Escrow record write error:', escrowErr);
        }

        // ── Video call auto-generation ─────────────────────────────────
        try {
          const startIso = appointment.appointment_date;
          const endIso   = new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();
          const meetLink = await createVideoCallLink({
            title:          `Ki Business – ${consultant.name}`,
            startIso,
            endIso,
            attendeeEmails: [eventMetadata.customer_email, consultant.email],
            appointmentId,
          });
          if (meetLink) {
            const db = getAdminFirestore();
            await Promise.all([
              db.collection('consultants').doc(consultantId).collection('appointments')
                .doc(appointmentId).update({ meet_link: meetLink }),
              db.collection('appointments').doc(appointmentId).update({ meet_link: meetLink }),
            ]);
          }
        } catch (meetErr) {
          console.error('Video call creation error:', meetErr);
        }

        let passwordResetLink: string | null = null;
        try {
          const { isNew } = await ensureFirebaseUser(
            eventMetadata.customer_email,
            eventMetadata.customer_name || ''
          );
          if (isNew) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            passwordResetLink = await getAdminAuth().generatePasswordResetLink(
              eventMetadata.customer_email,
              { url: `${appUrl}/onboarding` }
            );
          }
        } catch (authErr) {
          console.error('Firebase user creation error:', authErr);
        }

        // ── Time credit (hourly listings) ──────────────────────────────
        const rawMeta         = eventMetadata as unknown as Record<string, string | undefined>;
        const durationMinutes = Number(rawMeta?.duration_minutes ?? 0);
        const clientEmail     = rawMeta?.customer_email ?? (sessionObj.customer_email as string | undefined);
        if (durationMinutes > 0 && clientEmail) {
          try {
            const auth       = getAdminAuth();
            const userRecord = await auth.getUserByEmail(clientEmail);
            const db2        = getAdminFirestore();
            await db2.collection('time_credits').add({
              client_uid:        userRecord.uid,
              consultant_id:     consultantId,
              listing_id:        rawMeta?.listing_id ?? '',
              total_minutes:     durationMinutes,
              used_minutes:      0,
              remaining_minutes: durationMinutes,
              appointment_ids:   [appointmentId],
              status:            'available',
              purchased_at:      Date.now(),
              expires_at:        Date.now() + 365 * 24 * 60 * 60 * 1000,
            });
          } catch (tcErr) {
            console.error('Time credit creation failed:', tcErr);
          }
        }

        await Promise.allSettled([
          syncToCalendar(consultantId, { ...appointment, id: appointmentId }),
          syncToOutlookCalendar(consultantId, { ...appointment, id: appointmentId }),
        ]);

        const icsContent = generateICS({ ...appointment, id: appointmentId }, consultant.email);
        await sendConfirmationEmail(
          eventMetadata.customer_email,
          consultant.email,
          consultant.name,
          { ...appointment, id: appointmentId },
          icsContent,
          passwordResetLink
        ).catch((err) => console.error('Email send failed:', err));
      } catch (err) {
        console.error(`checkout.session.completed processing error (${consultantId}):`, err);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('Webhook general error:', err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
