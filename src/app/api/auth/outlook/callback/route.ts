import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const appUrl        = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010';
  const clientId      = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret  = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId      = process.env.MICROSOFT_TENANT_ID ?? 'common';
  const code          = request.nextUrl.searchParams.get('code');
  const uid           = request.nextUrl.searchParams.get('state');

  const failUrl = `${appUrl}/dashboard/settings?tab=integrations&error=outlook_auth_failed`;

  if (!clientId || !clientSecret || !code || !uid) {
    return NextResponse.redirect(failUrl);
  }

  try {
    const redirectUri = `${appUrl}/api/auth/outlook/callback`;
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     clientId,
          client_secret: clientSecret,
          code,
          redirect_uri:  redirectUri,
          grant_type:    'authorization_code',
        }),
      }
    );

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return NextResponse.redirect(failUrl);
    }

    const db = getAdminFirestore();
    await db.collection('users').doc(uid).set({
      outlook_integration: {
        connected:     true,
        provider:      'outlook',
        access_token:  tokens.access_token  ?? null,
        refresh_token: tokens.refresh_token ?? null,
        expiry:        tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
        scope:         tokens.scope         ?? null,
        updated_at:    Date.now(),
      },
    }, { merge: true });

    return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=integrations&connected=outlook`);
  } catch (err) {
    console.error('[outlook/callback]', err);
    return NextResponse.redirect(failUrl);
  }
}
