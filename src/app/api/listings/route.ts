import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import type { ConsultantListing } from '@/types/marketplace';

export const dynamic = 'force-dynamic';

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

// GET /api/listings?consultant_id=xxx[&include_user=true]
// GET /api/listings?all=true          (admin: all listings)
// GET /api/listings?active_only=true  (client: all active listings)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const uid         = searchParams.get('consultant_id');
    const all         = searchParams.get('all') === 'true';
    const activeOnly  = searchParams.get('active_only') === 'true';
    const includeUser = searchParams.get('include_user') === 'true';

    const db = getAdminFirestore();
    let query: FirebaseFirestore.Query = db.collection('consultant_listings');

    if (uid) {
      query = query.where('consultant_id', '==', uid);
    } else if (activeOnly) {
      query = query.where('is_active', '==', true);
    }
    // all=true → no filter, returns everything (for admins)

    const snap = await query.get();
    const listings: ConsultantListing[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ConsultantListing, 'id'>),
    }));
    listings.sort((a, b) => b.created_at - a.created_at);

    // Optionally include the user's profile fields (kyc_status, categories)
    let user: Record<string, unknown> | null = null;
    if (uid && includeUser) {
      const userSnap = await db.collection('users').doc(uid).get();
      if (userSnap.exists) {
        const d = userSnap.data()!;
        user = {
          categories: d.categories ?? [],
          kyc_status: d.kyc_status ?? 'none',
          role:       d.role ?? 'client',
          modes:      d.modes ?? [],
        };
      }
    }

    return NextResponse.json({ listings, ...(user ? { user } : {}) });
  } catch (err) {
    console.error('GET /api/listings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/listings — create
export async function POST(req: NextRequest) {
  try {
    const callerUid = await verifyToken(req);
    if (!callerUid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { listing, uid, displayName } = body as {
      listing: Omit<ConsultantListing, 'id' | 'consultant_id' | 'consultant_name' | 'created_at' | 'updated_at'>;
      uid: string;
      displayName?: string;
    };

    if (!listing || !uid) return NextResponse.json({ error: 'listing and uid required' }, { status: 400 });

    // Only the owner or admin can create
    const db       = getAdminFirestore();
    const userSnap = await db.collection('users').doc(callerUid).get();
    const callerRole = userSnap.data()?.role ?? '';
    const isAdmin    = callerUid === uid || callerRole === 'admin' || callerRole === 'supervisor';
    if (!isAdmin && callerUid !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = Date.now();
    const docRef = await db.collection('consultant_listings').add({
      ...listing,
      consultant_id:   uid,
      consultant_name: displayName ?? '',
      created_at:      now,
      updated_at:      now,
    });

    return NextResponse.json({ id: docRef.id });
  } catch (err) {
    console.error('POST /api/listings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
