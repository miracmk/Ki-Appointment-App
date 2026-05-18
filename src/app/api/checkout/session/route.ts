import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getConsultantStripeApiKey, createAppointment } from '@/lib/marketplace';
import { AppointmentMetadata } from '@/types/marketplace';

const pricingMap: Record<string, { amount: number; name: string }> = {
  starter: { amount: 20000, name: 'Starter Consultation Package' },
  growth: { amount: 100000, name: 'Growth Consultation Package' },
  scale: { amount: 500000, name: 'Scale Consultation Package' },
  executive: { amount: 1000000, name: 'Executive Consultation Package' },
};

const TIMEZONE_OFFSETS: Record<string, string> = {
  'America/New_York': '-04:00',
  'America/Chicago': '-05:00',
  'America/Denver': '-06:00',
  'America/Los_Angeles': '-07:00',
  'Europe/London': '+00:00',
  'Europe/Paris': '+01:00',
  'Asia/Dubai': '+04:00',
  'Asia/Tokyo': '+09:00',
  'Australia/Sydney': '+10:00',
  UTC: 'Z',
};

function buildIsoUtcDate(date: string, time: string, timezone: string) {
  const offset = TIMEZONE_OFFSETS[timezone] || 'Z';
  const dateTime = offset === 'Z' ? `${date}T${time}:00Z` : `${date}T${time}:00${offset}`;
  return new Date(dateTime).toISOString();
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
        {
          error:
            'Missing required fields. consultantId, packageId, customerEmail, appointmentDate, and appointmentTime are all required.',
        },
        { status: 400 }
      );
    }

    const selectedPackage = pricingMap[packageId];
    if (!selectedPackage) {
      return NextResponse.json({ error: 'Invalid package selected.' }, { status: 400 });
    }

    const stripeApiKey = await getConsultantStripeApiKey(consultantId);
    if (!stripeApiKey) {
      console.error(`Stripe configuration missing for consultant ${consultantId}`);
      return NextResponse.json(
        {
          error: 'Stripe is not configured for this consultant. Please contact the consultant or support.',
        },
        { status: 503 }
      );
    }

    const stripe = new Stripe(stripeApiKey, { apiVersion: '2023-10-16' });
    const appointmentDateUtc = buildIsoUtcDate(appointmentDate, appointmentTime, appointmentTimezone || 'UTC');

    const appointmentId = await createAppointment(consultantId, {
      consultant_id: consultantId,
      customer_email: customerEmail,
      customer_name: customerName || '',
      appointment_date: appointmentDateUtc,
      appointment_time: appointmentTime,
      appointment_timezone: appointmentTimezone || 'UTC',
      package_id: packageId,
      status: 'pending',
      payment_amount: selectedPackage.amount,
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
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId}`;
    const cancelUrl = `${baseUrl}/#pricing`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPackage.name,
              description: `Consultation package with ${selectedPackage.name}`,
            },
            unit_amount: selectedPackage.amount,
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
    });

    return NextResponse.json({ sessionId: session.id, appointmentId });
  } catch (error: any) {
    console.error('Stripe checkout session error:', error);

    if (error.message?.includes('authentication')) {
      return NextResponse.json(
        { error: 'Stripe authentication failed. Please verify consultant Stripe configuration.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: error.message || 'Unable to create Stripe checkout session.' }, { status: 500 });
  }
}
