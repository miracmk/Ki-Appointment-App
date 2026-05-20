import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import type { KycApplication } from '@/types/marketplace';

export const dynamic = 'force-dynamic';

/**
 * GET /api/kyc/status
 * Returns the authenticated user's KYC application and user document.
 */
export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let uid: string;
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const db = getAdminFirestore();

  const [userSnap, kycSnap] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('kyc_applications').doc(uid).get(),
  ]);

  const userData = userSnap.data();
  const kycData = kycSnap.exists ? (kycSnap.data() as KycApplication) : null;

  return NextResponse.json({
    kycStatus: userData?.kycStatus ?? userData?.kyc_status ?? 'unverified',
    role: userData?.role ?? 'client',
    application: kycData,
  });
}
