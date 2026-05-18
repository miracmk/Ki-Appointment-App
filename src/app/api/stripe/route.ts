import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getConsultantStripeApiKey } from '@/lib/marketplace';

const packagePrices: Record<string, number> = {
  starter: 20000,
  growth: 100000,
  scale: 500000,
  executive: 1000000,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultantId, packageId, email, name, appointmentDate, appointmentTime, appointmentTimezone } = body;

    if (!consultantId || !packageId || !email) {
      return NextResponse.json(
        { error: 'consultantId, packageId, and email are required.' },
        { status: 400 }
      );
    }

    const amount = packagePrices[packageId];
    if (!amount) {
      return NextResponse.json({ error: 'Invalid package selected.' }, { status: 400 });
    }

    const stripeApiKey = await getConsultantStripeApiKey(consultantId);
    if (!stripeApiKey) {
      console.error(`Missing Stripe API key for consultant ${consultantId}`);
      return NextResponse.json(
        { error: 'Stripe is not configured for this consultant.' },
        { status: 503 }
      );
    }

    const stripe = new Stripe(stripeApiKey, { apiVersion: '2023-10-16' });
    const metadata: Record<string, string> = {
      consultant_id: consultantId,
      package_id: packageId,
      customer_email: email,
      appointment_date: appointmentDate || '',
      appointment_time: appointmentTime || '',
      appointment_timezone: appointmentTimezone || 'UTC',
    };

    if (name) {
      metadata.customer_name = name;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Stripe error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}