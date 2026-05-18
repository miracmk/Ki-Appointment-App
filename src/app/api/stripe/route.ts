import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerStripeSecret } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { packageId, email, stripeSecretKey } = body;
    const secretKey = getServerStripeSecret({ stripeSecretKey });

    if (!secretKey) {
      return NextResponse.json(
        { error: 'Stripe secret key is missing. Set STRIPE_SECRET_KEY in environment variables or fill it on /admin.' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });

    const packagePrices: Record<string, number> = {
      starter: 20000,
      growth: 100000,
      scale: 500000,
      executive: 1000000,
    };

    const amount = packagePrices[packageId];
    if (!amount) {
      return NextResponse.json(
        { error: 'Invalid package selected' },
        { status: 400 }
      );
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        packageId,
        email,
      },
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