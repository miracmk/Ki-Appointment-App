import { NextResponse, type NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getAdminFirestore } from '@/lib/firebase-admin';

const KYC_FEE_CENTS = 500; // $5

export async function POST(req: NextRequest) {
  try {
    const { consultant_id } = await req.json() as { consultant_id: string };

    if (!consultant_id) {
      return NextResponse.json({ error: 'consultant_id zorunlu.' }, { status: 400 });
    }

    const platformKey = process.env.STRIPE_SECRET_KEY;
    if (!platformKey) {
      return NextResponse.json({ error: 'Platform Stripe yapılandırılmamış.' }, { status: 503 });
    }

    const db  = getAdminFirestore();
    const doc = await db.collection('users').doc(consultant_id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Danışman bulunamadı.' }, { status: 404 });
    }

    const data = doc.data();
    if (data?.kyc_fee_paid) {
      return NextResponse.json({ error: 'KYC ücreti zaten ödenmiş.' }, { status: 409 });
    }

    const stripe  = new Stripe(platformKey, { apiVersion: '2023-10-16' });
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

    // Create $5 payment session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'KYC Doğrulama Ücreti' },
            unit_amount: KYC_FEE_CENTS,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type:          'kyc_fee',
        consultant_id,
      },
      success_url: `${baseUrl}/consultant/kyc?fee=paid`,
      cancel_url:  `${baseUrl}/consultant/kyc`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('KYC fee session error:', err);
    return NextResponse.json({ error: 'KYC ödeme oturumu oluşturulamadı.' }, { status: 500 });
  }
}
