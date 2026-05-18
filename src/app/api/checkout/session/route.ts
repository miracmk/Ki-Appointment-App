import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import {
  getConsultantStripeApiKey,
  getConsultantProfile,
  createAppointment,
  calculateFees,
} from '@/lib/marketplace';
import { AppointmentMetadata, PaymentMode } from '@/types/marketplace';

const pricingMap: Record<string, { amount: number; name: string }> = {
  starter: { amount: 20000, name: 'Starter Danışmanlık Paketi' },
  growth: { amount: 100000, name: 'Growth Danışmanlık Paketi' },
  scale: { amount: 500000, name: 'Scale Danışmanlık Paketi' },
  executive: { amount: 1000000, name: 'Executive Danışmanlık Paketi' },
};

function buildIsoUtcDate(date: string, time: string, timezone: string): string {
  const probe = new Date(`${date}T${time}:00.000Z`);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(probe);

  const p: Record<string, string> = {};
  for (const { type, value } of parts) p[type] = value;

  const localAsUtcMs = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour === '24' ? '0' : p.hour),
    Number(p.minute),
    Number(p.second)
  );

  const offsetMs = localAsUtcMs - probe.getTime();
  return new Date(probe.getTime() - offsetMs).toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      consultantId,
      packageId,
      customerEmail,
      customerName,
      appointmentDate,
      appointmentTime,
      appointmentTimezone,
    } = body;

    if (!consultantId || !packageId || !customerEmail || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik: consultantId, packageId, customerEmail, appointmentDate, appointmentTime' },
        { status: 400 }
      );
    }

    const selectedPackage = pricingMap[packageId];
    if (!selectedPackage) {
      return NextResponse.json({ error: 'Geçersiz paket seçimi.' }, { status: 400 });
    }

    const consultant = await getConsultantProfile(consultantId);
    if (!consultant || !consultant.is_active) {
      return NextResponse.json(
        { error: 'Danışman bulunamadı veya aktif değil.' },
        { status: 404 }
      );
    }

    const paymentMode: PaymentMode = consultant.payment_mode ?? 'own_keys';
    const amount = selectedPackage.amount;
    const fees = calculateFees(amount);

    const appointmentDateUtc = buildIsoUtcDate(
      appointmentDate,
      appointmentTime,
      appointmentTimezone || 'UTC'
    );

    const appointmentId = await createAppointment(consultantId, {
      consultant_id: consultantId,
      customer_email: customerEmail,
      customer_name: customerName || '',
      appointment_date: appointmentDateUtc,
      appointment_time: appointmentTime,
      appointment_timezone: appointmentTimezone || 'UTC',
      package_id: packageId,
      status: 'pending',
      payment_amount: amount,
    });

    const metadata: Stripe.MetadataParam = {
      consultant_id: consultantId,
      appointment_date: appointmentDateUtc,
      appointment_time: appointmentTime,
      appointment_timezone: appointmentTimezone || 'UTC',
      package_id: packageId,
      customer_email: customerEmail,
      customer_name: customerName || '',
      session_id: appointmentId,
      payment_mode: paymentMode,
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId}`;
    const cancelUrl = `${baseUrl}/#pricing`;

    const baseSessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPackage.name,
              description: `${consultant.name} ile danışmanlık`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
    };

    let session: Stripe.Checkout.Session;

    if (paymentMode === 'own_keys') {
      // ── Mode B: wallet must cover the 10% platform fee ───────────────
      if ((consultant.ki_wallet_cents ?? 0) < fees.platform_fee_cents) {
        return NextResponse.json(
          {
            error: `Yetersiz Ki Wallet bakiyesi. Gereken: $${(fees.platform_fee_cents / 100).toFixed(2)}, Mevcut: $${((consultant.ki_wallet_cents ?? 0) / 100).toFixed(2)}. Lütfen cüzdanınızı doldurun.`,
            required_cents: fees.platform_fee_cents,
            available_cents: consultant.ki_wallet_cents ?? 0,
          },
          { status: 402 }
        );
      }

      // ── Consultant's own Stripe account ──────────────────────────────
      const stripeApiKey = await getConsultantStripeApiKey(consultantId);
      if (!stripeApiKey) {
        return NextResponse.json(
          { error: 'Bu danışman için Stripe yapılandırılmamış. Lütfen danışmanınızla iletişime geçin.' },
          { status: 503 }
        );
      }
      const stripe = new Stripe(stripeApiKey, { apiVersion: '2023-10-16' });
      session = await stripe.checkout.sessions.create(baseSessionParams);

    } else if (paymentMode === 'ki_connect') {
      // ── Stripe Connect: platform collects, auto-splits ────────────────
      const connectAccountId = consultant.stripe_connect_account_id;
      if (!connectAccountId) {
        return NextResponse.json(
          { error: 'Bu danışman için Stripe Connect hesabı bağlı değil.' },
          { status: 503 }
        );
      }
      const platformKey = process.env.STRIPE_SECRET_KEY;
      if (!platformKey) {
        return NextResponse.json({ error: 'Platform Stripe yapılandırılmamış.' }, { status: 503 });
      }
      const stripe = new Stripe(platformKey, { apiVersion: '2023-10-16' });
      session = await stripe.checkout.sessions.create({
        ...baseSessionParams,
        payment_intent_data: {
          application_fee_amount: fees.platform_fee_cents,
          transfer_data: { destination: connectAccountId },
        },
      });

    } else if (paymentMode === 'ki_escrow' || paymentMode === 'direct') {
      // ── Ki Business collects all (escrow or direct) ───────────────────
      const platformKey = process.env.STRIPE_SECRET_KEY;
      if (!platformKey) {
        return NextResponse.json({ error: 'Platform Stripe yapılandırılmamış.' }, { status: 503 });
      }
      const stripe = new Stripe(platformKey, { apiVersion: '2023-10-16' });
      session = await stripe.checkout.sessions.create(baseSessionParams);

    } else {
      return NextResponse.json({ error: 'Bilinmeyen ödeme modu.' }, { status: 400 });
    }

    return NextResponse.json({
      sessionId: session.id,
      appointmentId,
      paymentMode,
      feeBreakdown: {
        platformFeeCents: fees.platform_fee_cents,
        consultantPayoutCents: fees.consultant_payout_cents,
      },
    });
  } catch (error: any) {
    console.error('Stripe checkout session hatası:', error);

    if (error.message?.includes('authentication')) {
      return NextResponse.json(
        { error: 'Stripe kimlik doğrulaması başarısız. Danışman Stripe yapılandırmasını kontrol edin.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Stripe checkout oturumu oluşturulamadı.' },
      { status: 500 }
    );
  }
}
