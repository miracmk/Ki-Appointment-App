import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010';
  const uid      = request.nextUrl.searchParams.get('uid');

  if (!clientId) {
    const dashUrl = `${appUrl}/dashboard/settings?tab=integrations&error=google_not_configured`;
    return NextResponse.redirect(dashUrl);
  }

  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;
  const scope = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ].join(' ');

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope,
    access_type:   'offline',
    prompt:        'consent',
    state:         uid,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
