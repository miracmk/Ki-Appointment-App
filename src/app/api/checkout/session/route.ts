import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import {
  getConsultantStripeApiKey,
  getConsultantProfile,
  createAppointment,
  calculateFees,
} from '@/lib/marketplace';
import { getActiveKiStripePosConfig } from '@/lib/stripe-pos';
import { AppointmentMetadata, PaymentMode } from '@/types/marketplace';

const pricingMap: Record<string, { amount: number; name: string }> = {
  starter: { amount: 20000, name: 'Starter Consulting Package' },
  growth: { amount: 100000, name: 'Growth Consulting Package' },
  scale: { amount: 500000, name: 'Scale Consulting Package' },
  executive: { amount: 1000000, name: 'Executive Consulting Package' },
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
      specialtyId,
      categoryId,
      listingId,
      amountCents,
      listingTitle,
      currency,
    } = body;

    if (!consultantId || !customerEmail || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar eksik: consultantId, customerEmail, appointmentDate, appointmentTime' },
        { status: 400 }
      );
    }

    // Support both listing-based (amountCents) and legacy package-based pricing
    let selectedPackage: { amount: number; name: string };
    if (amountCents) {
      const cents = parseInt(String(amountCents), 10);
      if (isNaN(cents) || cents < 50) {
        return NextResponse.json({ error: 'amountCents must be at least 50 (¢50).' }, { status: 400 });
      }
      selectedPackage = { amount: cents, name: listingTitle || 'Consulting Service' };
    } else {
      if (!packageId) {
        return NextResponse.json({ error: 'Either packageId or amountCents is required.' }, { status: 400 });
      }
      const pkg = pricingMap[packageId];
      if (!pkg) {
        return NextResponse.json({ error: 'Invalid package selection.' }, { status: 400 });
      }
      selectedPackage = pkg;
    }

    const consultant = await getConsultantProfile(consultantId);
    if (!consultant || !consultant.is_active) {
      return NextResponse.json(
        { error: 'Consultant not found or not active.' },
        { status: 404 }
      );
    }

    const paymentMode: PaymentMode = consultant.payment_mode ?? 'own_keys';
    const consultingFeeCents = selectedPackage.amount;
    const stripeCurrency = (currency ?? 'usd').toLowerCase();
    
    // ─── CHECKOUT MATH: Two Conditions ───────────────────────────────────
    // Condition A: If Ki Business is the consultant (direct mode)
    // Total = Consulting Fee only
    // Condition B: Standard Consultant
    // Total = Consulting Fee + Service Fee (10% platform fee + Stripe fee)
    
    const stripeProcessingFeeBps = 290; // 2.9% + $0.30 per transaction
    let totalChargedCents = consultingFeeCents;
    let platformFeeCents = 0;
    let stripeFeeCents = 0;

    // If NOT Ki Business direct service, add platform fee (10%)
    if (paymentMode !== 'direct') {
      platformFeeCents = Math.ceil(consultingFeeCents * 0.10); // 10% platform fee
      stripeFeeCents = Math.ceil((consultingFeeCents + platformFeeCents) * (stripeProcessingFeeBps / 10000)) + 30; // 2.9% + $0.30
      totalChargedCents = consultingFeeCents + platformFeeCents + stripeFeeCents;
    } else {
      // Direct Ki Business: only add Stripe fee on consulting amount
      stripeFeeCents = Math.ceil(consultingFeeCents * (stripeProcessingFeeBps / 10000)) + 30;
      totalChargedCents = consultingFeeCents + stripeFeeCents;
    }

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
      payment_amount: consultingFeeCents,
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
      consulting_fee_cents: String(consultingFeeCents),
      platform_fee_cents: String(platformFeeCents),
      stripe_fee_cents: String(stripeFeeCents),
      total_charged_cents: String(totalChargedCents),
      specialty_id: specialtyId ?? '',
      category_id: categoryId ?? '',
      listing_id: listingId ?? '',
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId}`;
    const cancelUrl = `${baseUrl}/#pricing`;

    // Calculate total amount charged to customer
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    
    // Add consulting fee
    lineItems.push({
      price_data: {
        currency: stripeCurrency,
        product_data: {
          name: selectedPackage.name,
          description: `Consulting session with ${consultant.name}`,
        },
        unit_amount: consultingFeeCents,
      },
      quantity: 1,
    });

    // Add platform fee if applicable
    if (platformFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: stripeCurrency,
          product_data: {
            name: 'Platform Fee (10%)',
            description: 'Ki Business service fee',
          },
          unit_amount: platformFeeCents,
        },
        quantity: 1,
      });
    }

    // Add Stripe processing fee if applicable
    if (stripeFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: stripeCurrency,
          product_data: {
            name: 'Payment Processing Fee',
            description: 'Stripe payment processing',
          },
          unit_amount: stripeFeeCents,
        },
        quantity: 1,
      });
    }

    const baseSessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
    };

    let session: Stripe.Checkout.Session;

    if (paymentMode === 'own_keys') {
      // Consultant's own Stripe account
      const stripeApiKey = await getConsultantStripeApiKey(consultantId);
      if (!stripeApiKey) {
        return NextResponse.json(
          { error: 'Stripe is not configured for this consultant. Please contact your consultant.' },
          { status: 503 }
        );
      }
      const stripe = new Stripe(stripeApiKey, { apiVersion: '2023-10-16' });
      session = await stripe.checkout.sessions.create(baseSessionParams);

    } else if (paymentMode === 'ki_connect') {
      // Stripe Connect: platform collects, auto-splits
      const connectAccountId = consultant.stripe_connect_account_id;
      if (!connectAccountId) {
        return NextResponse.json(
          { error: 'No Stripe Connect account linked for this consultant.' },
          { status: 503 }
        );
      }
      const activeConfig = await getActiveKiStripePosConfig();
      const stripe = new Stripe(activeConfig.secretKey, { apiVersion: '2023-10-16' });
      session = await stripe.checkout.sessions.create({
        ...baseSessionParams,
        payment_intent_data: {
          application_fee_amount: platformFeeCents,
          transfer_data: { destination: connectAccountId },
        },
      });

    } else if (paymentMode === 'ki_escrow' || paymentMode === 'direct') {
      // Ki Business collects all (escrow or direct)
      const activeConfig = await getActiveKiStripePosConfig();
      const stripe = new Stripe(activeConfig.secretKey, { apiVersion: '2023-10-16' });
      session = await stripe.checkout.sessions.create(baseSessionParams);

    } else {
      return NextResponse.json({ error: 'Unknown payment mode.' }, { status: 400 });
    }

    return NextResponse.json({
      sessionId: session.id,
      appointmentId,
      paymentMode,
      feeBreakdown: {
        consultingFeeCents,
        platformFeeCents,
        stripeFeeCents,
        totalChargedCents,
        consultingFeeFormatted: `$${(consultingFeeCents / 100).toFixed(2)}`,
        platformFeeFormatted: platformFeeCents > 0 ? `$${(platformFeeCents / 100).toFixed(2)}` : '$0.00',
        stripeFeeFormatted: stripeFeeCents > 0 ? `$${(stripeFeeCents / 100).toFixed(2)}` : '$0.00',
        totalChargedFormatted: `$${(totalChargedCents / 100).toFixed(2)}`,
      },
    });
  } catch (error: any) {
    console.error('Stripe checkout session error:', error);

    if (error.message?.includes('authentication')) {
      return NextResponse.json(
        { error: 'Stripe authentication failed. Check the consultant Stripe configuration.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Could not create Stripe checkout session.' },
      { status: 500 }
    );
  }
}
