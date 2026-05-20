import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getActiveKiStripePosConfig } from '@/lib/stripe-pos';

export async function POST(req: NextRequest) {
  try {
    const { amount_cents, consultant_id } = await req.json() as {
      amount_cents: number;
      consultant_id: string;
    };

    if (!consultant_id) {
      return NextResponse.json({ error: 'consultant_id is required.' }, { status: 400 });
    }
    if (!amount_cents || amount_cents < 1000) {
      return NextResponse.json({ error: 'Minimum top-up amount is $10 (1000 cents).' }, { status: 400 });
    }

    const activeConfig = await getActiveKiStripePosConfig();

    // Verify consultant exists
    const db  = getAdminFirestore();
    const doc = await db.collection('users').doc(consultant_id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Consultant not found.' }, { status: 404 });
    }

    const stripe  = new Stripe(activeConfig.secretKey, { apiVersion: '2023-10-16' });
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Ki Wallet Top-up' },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type:          'wallet_topup',
        consultant_id,
      },
      success_url: `${baseUrl}/consultant/payments?topup=success`,
      cancel_url:  `${baseUrl}/consultant/payments?topup=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Wallet topup error:', err);
    return NextResponse.json({ error: 'Could not create top-up session.' }, { status: 500 });
  }
}
