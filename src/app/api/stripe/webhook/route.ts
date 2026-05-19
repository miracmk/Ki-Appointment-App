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
import { syncToGoogleCalendar, syncToOutlookCalendar, generateICS } from '@/lib/calendar-sync';
import { createMeetLink } from '@/lib/google-meet';
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
    console.warn('SMTP yapılandırılmamış; onay emaili atlandı.');
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
    ? `\n\n=== MÜŞTERİ PORTALI ===\nRandevunuzu ve belgelerinizi görüntülemek için portal hesabınızı aktif edin:\n${passwordResetLink}\n\nBu link 24 saat geçerlidir.`
    : `\n\n=== MÜŞTERİ PORTALI ===\nMevcut hesabınızla giriş yapabilirsiniz:\n${appUrl}/login`;

  const mailBody = `Merhaba${appointment.customer_name ? ' ' + appointment.customer_name : ''},

Randevunuz onaylandı!

Danışman  : ${consultantName} (${consultantEmail})
Paket     : ${packageName}
Tarih/Saat: ${appointmentDisplay}
${portalSection}

=== SONRAKI ADIM ===
Danışmanlık sürecinizi başlatmak için lütfen aşağıdaki bağlantıdan kısa bir başlangıç formu doldurun:
${onboardingUrl}

Ekteki .ics dosyasını takviminize ekleyebilirsiniz.

Herhangi bir sorunuz için danışmanınızla doğrudan iletişime geçebilirsiniz.

Saygılarımızla,
Ki Business Solutions`;

  await transporter.sendMail({
    from: emailFrom,
    to,
    subject: 'Randevunuz Onaylandı – Ki Business Solutions',
    text: mailBody,
    icalEvent: {
      filename: 'randevu.ics',
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
      return NextResponse.json({ error: 'Stripe-Signature başlığı eksik.' }, { status: 400 });
    }

    // Parse raw JSON to read payment_mode from metadata before signature check
    let rawEvent: any;
    try {
      rawEvent = JSON.parse(payload);
    } catch {
      return NextResponse.json({ error: 'Geçersiz JSON.' }, { status: 400 });
    }

    const session = rawEvent.data?.object;
    const metadata = session?.metadata as AppointmentMetadata | undefined;

    if (!metadata?.consultant_id) {
      console.error('Stripe metadata içinde consultant_id yok:', metadata);
      return NextResponse.json({ error: 'consultant_id eksik.' }, { status: 400 });
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
      console.error(`Webhook secret bulunamadı (mode=${paymentMode}, consultant=${consultantId})`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(stripeApiKey || 'placeholder', { apiVersion: '2023-10-16' });
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook imza doğrulaması başarısız (${consultantId}):`, err);
      return NextResponse.json({ error: `Webhook hatası: ${err.message}` }, { status: 400 });
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
            consultant_id:     consultantId,
            amount_cents:      amountCents,
            type:              'topup_stripe',
            stripe_session_id: sessionObj.id,
            created_at:        Date.now(),
          });
        });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const appointmentId = eventMetadata.session_id ?? (eventMetadata as { appointment_id?: string }).appointment_id;

      if (!appointmentId) {
        console.error('Webhook metadata içinde appointment ID yok', eventMetadata);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      try {
        const appointment = await getAppointment(consultantId, appointmentId);
        if (!appointment) {
          console.error(`Randevu bulunamadı: ${appointmentId}`);
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const consultant = await getConsultantProfile(consultantId);
        if (!consultant) {
          console.error(`Danışman profili bulunamadı: ${consultantId}`);
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
              consultant_id:  consultantId,
              amount_cents:   -fees.platform_fee_cents,
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

        // ── Google Meet auto-generation ───────────────────────────────
        try {
          const startIso = appointment.appointment_date;
          const endIso   = new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();
          const meetLink = await createMeetLink({
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
          console.error('Google Meet oluşturma hatası:', meetErr);
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
          console.error('Firebase kullanıcı oluşturma hatası:', authErr);
        }

        await Promise.allSettled([
          syncToGoogleCalendar(consultantId, { ...appointment, id: appointmentId }),
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
        ).catch((err) => console.error('Email gönderilemedi:', err));
      } catch (err) {
        console.error(`checkout.session.completed işleme hatası (${consultantId}):`, err);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('Webhook genel hata:', err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
