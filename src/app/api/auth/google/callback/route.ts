import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010';
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const code         = request.nextUrl.searchParams.get('code');
  const uid          = request.nextUrl.searchParams.get('state');

  const failUrl = `${appUrl}/dashboard/settings?tab=integrations&error=google_auth_failed`;

  if (!clientId || !clientSecret || !code || !uid) {
    return NextResponse.redirect(failUrl);
  }

  try {
    const redirectUri = `${appUrl}/api/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.refresh_token && !tokens.access_token) {
      return NextResponse.redirect(failUrl);
    }

    const db = getAdminFirestore();
    await db.collection('users').doc(uid).set({
      calendar_integration: {
        connected:     true,
        provider:      'google',
        access_token:  tokens.access_token  ?? null,
        refresh_token: tokens.refresh_token ?? null,
        expiry:        tokens.expiry_date   ?? null,
        scope:         tokens.scope         ?? null,
        updated_at:    Date.now(),
      },
    }, { merge: true });

    return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=integrations&connected=1`);
  } catch (err) {
    console.error('[google/callback]', err);
    return NextResponse.redirect(failUrl);
  }
}
