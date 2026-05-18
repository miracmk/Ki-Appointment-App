import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  : null;

const pricingMap: Record<string, { amount: number; name: string }> = {
  starter: { amount: 20000, name: 'Starter Consultation Package' },
  growth: { amount: 100000, name: 'Growth Consultation Package' },
  scale: { amount: 500000, name: 'Scale Consultation Package' },
  executive: { amount: 1000000, name: 'Executive Consultation Package' },
};

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { packageId } = body;
  const selectedPackage = pricingMap[packageId];

  if (!selectedPackage) {
    return NextResponse.json({ error: 'Invalid package selected.' }, { status: 400 });
  }

  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'}/#pricing`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPackage.name,
              description: `Ki Business Solutions ${selectedPackage.name}`,
            },
            unit_amount: selectedPackage.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        packageId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Stripe Checkout session error:', error);
    return NextResponse.json({ error: error.message || 'Unable to create Stripe checkout session.' }, { status: 500 });
  }
}
