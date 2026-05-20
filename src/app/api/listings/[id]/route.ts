import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import type { ConsultantListing } from '@/types/marketplace';

async function verifyToken(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

async function assertOwner(callerUid: string, listingId: string): Promise<{ ok: boolean; listing?: ConsultantListing }> {
  const db   = getAdminFirestore();
  const snap = await db.collection('consultant_listings').doc(listingId).get();
  if (!snap.exists) return { ok: false };

  const data     = snap.data() as Omit<ConsultantListing, 'id'>;
  const userSnap = await db.collection('users').doc(callerUid).get();
  const role     = userSnap.data()?.role ?? '';
  const isAdmin  = role === 'admin' || role === 'supervisor';

  if (data.consultant_id !== callerUid && !isAdmin) return { ok: false };
  return { ok: true, listing: { id: snap.id, ...data } };
}

// PUT /api/listings/[id] — update
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const callerUid = await verifyToken(req);
    if (!callerUid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ok } = await assertOwner(callerUid, params.id);
    if (!ok) return NextResponse.json({ error: 'Forbidden or not found' }, { status: 403 });

    const body = await req.json() as Partial<ConsultantListing>;

    const db = getAdminFirestore();
    await db.collection('consultant_listings').doc(params.id).update({
      ...body,
      updated_at: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/listings/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/listings/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const callerUid = await verifyToken(req);
    if (!callerUid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ok } = await assertOwner(callerUid, params.id);
    if (!ok) return NextResponse.json({ error: 'Forbidden or not found' }, { status: 403 });

    const db = getAdminFirestore();
    await db.collection('consultant_listings').doc(params.id).delete();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/listings/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
