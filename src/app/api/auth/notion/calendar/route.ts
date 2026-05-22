import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const clientId = process.env.NOTION_CLIENT_ID;
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010';
  const uid      = request.nextUrl.searchParams.get('uid');

  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?tab=integrations&error=notion_not_configured`);
  }
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
  }

  const redirectUri = `${appUrl}/api/auth/notion/callback`;

  const params = new URLSearchParams({
    client_id:     clientId,
    response_type: 'code',
    owner:         'user',
    redirect_uri:  redirectUri,
    state:         uid,
  });

  return NextResponse.redirect(`https://api.notion.com/v1/oauth/authorize?${params}`);
}
