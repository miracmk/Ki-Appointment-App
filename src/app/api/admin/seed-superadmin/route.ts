import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

const SUPERADMIN_EMAIL = 'kibusiness.global@gmail.com';
const SUPERADMIN_PASSWORD = 'KiBusiness2026!5562';
const SUPERADMIN_DISPLAY_NAME = 'Ki Business Super Admin';

export async function POST() {
  const auth = getAdminAuth();
  const db = getAdminFirestore();

  try {
    let user;
    try {
      user = await auth.getUserByEmail(SUPERADMIN_EMAIL);
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    if (!user) {
      user = await auth.createUser({
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD,
        displayName: SUPERADMIN_DISPLAY_NAME,
        emailVerified: true,
      });
    } else {
      user = await auth.updateUser(user.uid, {
        password: SUPERADMIN_PASSWORD,
        displayName: SUPERADMIN_DISPLAY_NAME,
        emailVerified: true,
      });
    }

    await auth.setCustomUserClaims(user.uid, { role: 'superadmin' });
    const now = Date.now();
    await db.collection('users').doc(user.uid).set(
      {
        uid: user.uid,
        email: SUPERADMIN_EMAIL,
        role: 'superadmin',
        displayName: SUPERADMIN_DISPLAY_NAME,
        kycStatus: 'verified',
        walletBalance: 0,
        isActive: true,
        createdAt: now,
        // legacy fields
        name: SUPERADMIN_DISPLAY_NAME,
        kyc_status: 'verified',
        ki_wallet_cents: 0,
        is_active: true,
        created_at: now,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, uid: user.uid });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to seed the superadmin account.' },
      { status: 500 }
    );
  }
}
