import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010';
  const clientId     = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const code         = request.nextUrl.searchParams.get('code');
  const uid          = request.nextUrl.searchParams.get('state');

  const failUrl = `${appUrl}/dashboard/settings?tab=integrations&error=notion_auth_failed`;

  if (!clientId || !clientSecret || !code || !uid) {
    return NextResponse.redirect(failUrl);
  }

  try {
    const redirectUri = `${appUrl}/api/auth/notion/callback`;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type:   'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return NextResponse.redirect(failUrl);
    }

    const db = getAdminFirestore();
    await db.collection('users').doc(uid).set({
      notion_integration: {
        connected:        true,
        provider:         'notion',
        access_token:     tokens.access_token       ?? null,
        workspace_id:     tokens.workspace_id       ?? null,
        workspace_name:   tokens.workspace_name     ?? null,
        duplicated_template_id: tokens.duplicated_template_id ?? null,
        bot_id:           tokens.bot_id             ?? null,
        updated_at:       Date.now(),
      },
    }, { merge: true });

    return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=integrations&connected=notion`);
  } catch (err) {
    console.error('[notion/callback]', err);
    return NextResponse.redirect(failUrl);
  }
}
