import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const clientId  = process.env.AZURE_AD_CLIENT_ID;
  const tenantId  = process.env.AZURE_AD_TENANT_ID ?? 'common';
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010';
  const uid       = request.nextUrl.searchParams.get('uid');

  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=integrations&error=outlook_not_configured`);
  }
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
  }

  const redirectUri = `${appUrl}/api/auth/outlook/callback`;
  const scope = [
    'Calendars.ReadWrite',
    'offline_access',
    'User.Read',
  ].join(' ');

  const params = new URLSearchParams({
    client_id:     clientId,
    response_type: 'code',
    redirect_uri:  redirectUri,
    scope,
    response_mode: 'query',
    state:         uid,
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`
  );
}
