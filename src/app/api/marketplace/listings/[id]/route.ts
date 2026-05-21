import { NextResponse, type NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { ConsultantListing } from '@/types/marketplace';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db   = getAdminFirestore();
    const snap = await db.collection('consultant_listings').doc(params.id).get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const listing = { id: snap.id, ...(snap.data() as Omit<ConsultantListing, 'id'>) };

    // Fetch consultant profile
    const consultantSnap = await db.collection('users').doc(listing.consultant_id).get();
    let consultant: Record<string, unknown> = {};
    if (consultantSnap.exists) {
      const d = consultantSnap.data()!;
      consultant = {
        uid:          consultantSnap.id,
        name:         d.name ?? d.displayName ?? '',
        email:        d.email ?? '',
        photo_url:    d.photo_url,
        title:        d.title,
        bio:          d.bio,
        rating:       d.rating ?? 0,
        review_count: d.review_count ?? 0,
        kyc_status:   d.kyc_status ?? 'none',
        languages:    d.languages ?? [],
        location:     d.location,
        is_ki_business: d.is_ki_business ?? false,
      };
    }

    return NextResponse.json({ listing, consultant });
  } catch (err) {
    console.error('GET /api/marketplace/listings/[id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
