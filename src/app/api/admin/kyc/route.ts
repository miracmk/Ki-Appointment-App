import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function verifyAdminToken(request: NextRequest): Promise<{ uid: string; role: string } | null> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    const db = getAdminFirestore();
    const snap = await db.collection('users').doc(decoded.uid).get();
    const role = snap.data()?.role ?? 'client';
    if (role !== 'admin' && role !== 'superadmin') return null;
    return { uid: decoded.uid, role };
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/kyc
 * Returns all kyc_applications with optional ?status= filter
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdminToken(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status'); // pending | approved | rejected | all

  const db = getAdminFirestore();
  let query = db.collection('kyc_applications') as FirebaseFirestore.Query;
  if (statusFilter && statusFilter !== 'all') {
    query = query.where('status', '==', statusFilter);
  }
  query = query.orderBy('submittedAt', 'desc');

  const snap = await query.get();
  const applications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ applications });
}

/**
 * POST /api/admin/kyc
 * Body: { userId, action: 'approve' | 'reject', rejectionReason? }
 *
 * On approve:
 *   - kyc_applications/{userId}.status = 'approved'
 *   - users/{userId}.kycStatus = 'verified', role = 'consultant'
 *
 * On reject:
 *   - kyc_applications/{userId}.status = 'rejected'
 *   - users/{userId}.kycStatus = 'rejected'
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdminToken(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, action, rejectionReason, consultantId } = body;

  // Support legacy 'consultantId' field used by the existing admin consultants page
  const targetUserId: string = userId ?? consultantId;
  if (!targetUserId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
  }

  const db = getAdminFirestore();
  const now = Date.now();

  if (action === 'approve') {
    // 1. Update kyc_applications document
    await db.collection('kyc_applications').doc(targetUserId).set(
      {
        status: 'approved',
        reviewedAt: now,
        reviewedByAdminId: admin.uid,
      },
      { merge: true }
    );

    // 2. Promote user to consultant role + mark KYC verified
    await db.collection('users').doc(targetUserId).set(
      {
        role: 'consultant',
        kycStatus: 'verified',
        // legacy field
        kyc_status: 'verified',
        updatedAt: now,
        updated_at: now,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, message: 'User promoted to consultant and KYC verified.' });
  }

  // action === 'reject'
  if (!rejectionReason) {
    return NextResponse.json({ error: 'rejectionReason is required for reject action' }, { status: 400 });
  }

  await db.collection('kyc_applications').doc(targetUserId).set(
    {
      status: 'rejected',
      rejectionReason,
      reviewedAt: now,
      reviewedByAdminId: admin.uid,
    },
    { merge: true }
  );

  await db.collection('users').doc(targetUserId).set(
    {
      kycStatus: 'rejected',
      // legacy fields
      kyc_status: 'rejected',
      kyc_rejection_reason: rejectionReason,
      updatedAt: now,
      updated_at: now,
    },
    { merge: true }
  );

  return NextResponse.json({ success: true, message: 'KYC application rejected.' });
}
