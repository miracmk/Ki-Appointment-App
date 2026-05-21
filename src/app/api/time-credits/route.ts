import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientUid, consultantId, listingId, totalMinutes, appointmentId } = body;

    if (!clientUid || !consultantId || !totalMinutes) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db  = getAdminFirestore();
    const now = Date.now();

    const ref = await db.collection('time_credits').add({
      client_uid:        clientUid,
      consultant_id:     consultantId,
      listing_id:        listingId ?? '',
      total_minutes:     totalMinutes,
      used_minutes:      0,
      remaining_minutes: totalMinutes,
      appointment_ids:   appointmentId ? [appointmentId] : [],
      status:            'available',
      purchased_at:      now,
      expires_at:        now + 365 * 24 * 60 * 60 * 1000,
    });

    return NextResponse.json({ id: ref.id, success: true });
  } catch (err) {
    console.error('Time credit creation error:', err);
    return NextResponse.json({ error: 'Could not create time credit' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientUid      = searchParams.get('clientUid');
  const consultantId   = searchParams.get('consultantId');

  if (!clientUid) {
    return NextResponse.json({ error: 'clientUid required' }, { status: 400 });
  }

  const db = getAdminFirestore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = db.collection('time_credits').where('client_uid', '==', clientUid);
  if (consultantId) q = q.where('consultant_id', '==', consultantId);

  const snap    = await q.get();
  const credits = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({ credits });
}
