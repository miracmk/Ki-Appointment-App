import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = '__session';
const FIVE_DAYS_MS = 60 * 60 * 24 * 5 * 1000;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const idToken = body.idToken || body.token;

  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  try {
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: FIVE_DAYS_MS / 1000,
    });
    return response;
  } catch (error) {
    console.error('[auth/session] createSessionCookie failed', error);
    return NextResponse.json({ error: 'Unable to create session cookie' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
