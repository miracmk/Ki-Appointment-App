import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stripe/connect/callback?code=xxx&state=xxx
 *
 * Handles Stripe Connect OAuth redirect.
 * Exchanges authorization code for connected account ID and saves it.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';

  try {
    const code = request.nextUrl.searchParams.get('code');
    const stateRaw = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');
    const errorDescription = request.nextUrl.searchParams.get('error_description');

    if (error) {
      console.error('Stripe Connect OAuth hata:', error, errorDescription);
      return NextResponse.redirect(
        `${appUrl}/admin/integrations?connect_error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !stateRaw) {
      return NextResponse.redirect(`${appUrl}/admin/integrations?connect_error=missing_params`);
    }

    let state: { consultant_id: string; admin_uid: string };
    try {
      state = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf8'));
    } catch {
      return NextResponse.redirect(`${appUrl}/admin/integrations?connect_error=invalid_state`);
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.redirect(`${appUrl}/admin/integrations?connect_error=no_stripe_key`);
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const connectedAccountId = response.stripe_user_id;
    if (!connectedAccountId) {
      return NextResponse.redirect(`${appUrl}/admin/integrations?connect_error=no_account_id`);
    }

    const db = getAdminFirestore();
    await db.collection('users').doc(state.consultant_id).set(
      {
        stripe_connect_account_id: connectedAccountId,
        updated_at: Date.now(),
      },
      { merge: true }
    );

    console.log(`Stripe Connect bağlandı: consultant=${state.consultant_id}, account=${connectedAccountId}`);

    return NextResponse.redirect(
      `${appUrl}/admin/integrations?connect_success=1&account_id=${connectedAccountId}`
    );
  } catch (err: any) {
    console.error('Stripe Connect callback hatası:', err);
    return NextResponse.redirect(
      `${appUrl}/admin/integrations?connect_error=${encodeURIComponent(err.message || 'callback_error')}`
    );
  }
}
