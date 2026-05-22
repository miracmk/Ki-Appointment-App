import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// GET /api/ratings?consultantId=X[&limit=20]
export async function GET(request: NextRequest) {
  const consultantId = request.nextUrl.searchParams.get('consultantId');
  if (!consultantId) {
    return NextResponse.json({ error: 'consultantId required' }, { status: 400 });
  }

  try {
    const db = getAdminFirestore();
    const limitN = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 20), 50);
    const snap = await db.collection('ratings')
      .where('consultant_id', '==', consultantId)
      .where('is_visible', '==', true)
      .orderBy('created_at', 'desc')
      .limit(limitN)
      .get();

    const ratings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ ratings });
  } catch (err) {
    console.error('[ratings GET]', err);
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
  }
}

// POST /api/ratings  — body: { consultantId, appointmentId, listingId, rating, comment }
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let clientUid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    clientUid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    consultantId: string;
    appointmentId: string;
    listingId?: string;
    rating: number;
    comment?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { consultantId, appointmentId, listingId, rating, comment } = body;
  if (!consultantId || !appointmentId || !rating) {
    return NextResponse.json({ error: 'consultantId, appointmentId and rating are required' }, { status: 400 });
  }
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return NextResponse.json({ error: 'rating must be an integer 1–5' }, { status: 400 });
  }

  const db = getAdminFirestore();

  // Verify appointment belongs to this client and is completed
  const apptSnap = await db.collection('appointments').doc(appointmentId).get();
  if (!apptSnap.exists) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  }
  const appt = apptSnap.data()!;
  if (appt.client_uid !== clientUid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (appt.status !== 'completed') {
    return NextResponse.json({ error: 'Can only rate completed appointments' }, { status: 400 });
  }

  // Prevent duplicate rating for same appointment
  const existingSnap = await db.collection('ratings')
    .where('appointment_id', '==', appointmentId)
    .where('client_uid', '==', clientUid)
    .limit(1).get();
  if (!existingSnap.empty) {
    return NextResponse.json({ error: 'Already rated this appointment' }, { status: 409 });
  }

  // Get client display info
  const clientSnap = await db.collection('users').doc(clientUid).get();
  const clientData = clientSnap.data() ?? {};
  const clientName = (clientData.displayName ?? clientData.name ?? 'Anonymous') as string;
  const clientPhoto = (clientData.photo_url ?? '') as string;

  await db.runTransaction(async (tx) => {
    // Create rating doc
    const ratingRef = db.collection('ratings').doc();
    tx.set(ratingRef, {
      consultant_id:  consultantId,
      client_uid:     clientUid,
      client_name:    clientName,
      client_photo:   clientPhoto,
      appointment_id: appointmentId,
      listing_id:     listingId ?? null,
      rating,
      comment:        comment?.trim() ?? '',
      is_visible:     true,
      created_at:     Date.now(),
    });

    // Mark appointment as rated
    tx.update(db.collection('appointments').doc(appointmentId), { rated: true });

    // Update consultant aggregate (incremental Firestore approach)
    const consultantRef = db.collection('users').doc(consultantId);
    tx.update(consultantRef, {
      rating_sum:   FieldValue.increment(rating),
      review_count: FieldValue.increment(1),
    });

    // Update listing aggregate if provided
    if (listingId) {
      const listingRef = db.collection('listings').doc(listingId);
      tx.update(listingRef, {
        rating_sum:   FieldValue.increment(rating),
        review_count: FieldValue.increment(1),
      });
    }
  });

  // Recompute and store the final average rating on consultant doc
  const consultantSnap = await db.collection('users').doc(consultantId).get();
  const consultantData = consultantSnap.data() ?? {};
  const ratingSum   = (consultantData.rating_sum   as number) ?? rating;
  const reviewCount = (consultantData.review_count as number) ?? 1;
  const avgRating   = Math.round((ratingSum / reviewCount) * 10) / 10;
  await db.collection('users').doc(consultantId).update({ rating: avgRating });

  if (listingId) {
    const listingSnap = await db.collection('listings').doc(listingId).get();
    const listingData = listingSnap.data() ?? {};
    const lSum   = (listingData.rating_sum   as number) ?? rating;
    const lCount = (listingData.review_count as number) ?? 1;
    await db.collection('listings').doc(listingId).update({
      rating: Math.round((lSum / lCount) * 10) / 10,
    });
  }

  return NextResponse.json({ success: true });
}
