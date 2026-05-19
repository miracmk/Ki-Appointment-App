import { NextResponse, NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stripe/connect/oauth?consultant_id=xxx
 *
 * Generates a Stripe Connect OAuth URL for a specific consultant.
 * Admin-only endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await getAdminAuth().verifyIdToken(token);

    if (!decoded.customClaims?.admin) {
      const userRecord = await getAdminAuth().getUser(decoded.uid);
      if (!userRecord.customClaims?.admin) {
        return NextResponse.json({ error: 'Admin yetkisi gerekli.' }, { status: 403 });
      }
    }

    const consultantId = request.nextUrl.searchParams.get('consultant_id');
    if (!consultantId) {
      return NextResponse.json({ error: 'consultant_id parametresi gerekli.' }, { status: 400 });
    }

    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'STRIPE_CONNECT_CLIENT_ID ortam değişkeni tanımlı değil.' },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/stripe/connect/callback`;

    const state = Buffer.from(JSON.stringify({ consultant_id: consultantId, admin_uid: decoded.uid })).toString('base64');

    const oauthUrl = new URL('https://connect.stripe.com/oauth/authorize');
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('client_id', clientId);
    oauthUrl.searchParams.set('scope', 'read_write');
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('state', state);
    oauthUrl.searchParams.set('stripe_user[email]', '');

    return NextResponse.json({ oauth_url: oauthUrl.toString() });
  } catch (err: any) {
    console.error('Stripe Connect OAuth URL oluşturma hatası:', err);
    return NextResponse.json({ error: err.message || 'Sunucu hatası.' }, { status: 500 });
  }
}
