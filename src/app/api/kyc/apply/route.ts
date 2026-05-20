import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/kyc/apply
 * Authenticated user submits a KYC application to become a consultant.
 *
 * Body: {
 *   firstName, lastName, nationalId, dateOfBirth,
 *   documentUrls?: string[]
 * }
 */
export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const { firstName, lastName, nationalId, dateOfBirth, documentUrls } = body;

  if (!firstName || !lastName || !nationalId || !dateOfBirth) {
    return NextResponse.json(
      { error: 'firstName, lastName, nationalId, and dateOfBirth are required' },
      { status: 400 }
    );
  }

  const db = getAdminFirestore();
  const now = Date.now();

  // Check for existing application
  const existing = await db.collection('kyc_applications').doc(uid).get();
  if (existing.exists) {
    const currentStatus = existing.data()?.status;
    if (currentStatus === 'pending' || currentStatus === 'approved') {
      return NextResponse.json(
        { error: `A KYC application with status "${currentStatus}" already exists for this account.` },
        { status: 409 }
      );
    }
  }

  // Create or overwrite the application (allows resubmission after rejection)
  await db.collection('kyc_applications').doc(uid).set({
    userId: uid,
    appliedRole: 'consultant',
    status: 'pending',
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    nationalId: nationalId.trim(),
    dateOfBirth: dateOfBirth.trim(),
    documentUrls: documentUrls ?? [],
    submittedAt: now,
    reviewedAt: null,
    reviewedByAdminId: null,
    rejectionReason: null,
  });

  // Update the user's kycStatus to 'pending'
  await db.collection('users').doc(uid).set(
    {
      kycStatus: 'pending',
      kyc_status: 'pending',
      updatedAt: now,
      updated_at: now,
    },
    { merge: true }
  );

  return NextResponse.json({ success: true, message: 'KYC application submitted successfully.' });
}
