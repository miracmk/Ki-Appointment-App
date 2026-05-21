import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { updateConsultantStripeSettings } from '@/lib/consultant-settings';
import { PaymentMode } from '@/types/marketplace';

export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const auth = getAdminAuth();
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(authToken);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const consultantId = decodedToken.uid;
    const body = await request.json();
    const { payment_mode, secret_key, webhook_secret } = body;

    const db = getAdminFirestore();

    if (payment_mode !== undefined) {
      const validModes: PaymentMode[] = ['ki_escrow', 'own_keys', 'ki_connect', 'direct'];
      if (!validModes.includes(payment_mode)) {
        return NextResponse.json({ error: `Invalid payment_mode. Valid: ${validModes.join(', ')}` }, { status: 400 });
      }
      await db.collection('users').doc(consultantId).set(
        { payment_mode, updated_at: Date.now() },
        { merge: true }
      );
    }

    // Update Stripe keys only when provided; for own_keys mode without keys,
    // verify Stripe is already configured
    if (secret_key && webhook_secret) {
      await updateConsultantStripeSettings(consultantId, secret_key, webhook_secret);
    } else if (payment_mode === 'own_keys') {
      const snap = await db.collection('users').doc(consultantId).get();
      const isActive = snap.data()?.stripe_settings?.is_active ?? false;
      if (!isActive) {
        return NextResponse.json(
          { error: 'Secret key and webhook secret are required (Stripe not yet configured).' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true, message: 'Stripe settings saved.' });
  } catch (error: any) {
    console.error('Error saving consultant stripe settings:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
