import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { MarketplaceCategory } from '@/types/marketplace';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { uid: string } }) {
  const { uid } = params;
  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });

  try {
    const db = getAdminFirestore();

    // Fetch user doc
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const d = userSnap.data()!;

    const profile = {
      uid,
      name:         (d.displayName ?? d.name ?? '') as string,
      email:        (d.email ?? '') as string,
      photo_url:    (d.photo_url ?? '') as string,
      role:         (d.role ?? 'client') as string,
      bio:          (d.bio ?? '') as string,
      title:        (d.title ?? '') as string,
      location:     (d.location ?? '') as string,
      languages:    (d.languages ?? []) as string[],
      categories:   (d.categories ?? []) as MarketplaceCategory[],
      rating:       (d.rating ?? 0) as number,
      review_count: (d.review_count ?? 0) as number,
      kyc_status:   (d.kyc_status ?? 'none') as string,
      is_ki_business: (d.is_ki_business ?? false) as boolean,
      created_at:   (d.created_at ?? 0) as number,
    };

    // If consultant, fetch their active listings
    let listings: Record<string, unknown>[] = [];
    if (d.role === 'consultant') {
      const listingsSnap = await db.collection('consultant_listings')
        .where('consultant_id', '==', uid)
        .where('is_active', '==', true)
        .orderBy('created_at', 'desc')
        .limit(6)
        .get();
      listings = listingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Fetch recent visible reviews
    const ratingsSnap = await db.collection('ratings')
      .where('consultant_id', '==', uid)
      .where('is_visible', '==', true)
      .orderBy('created_at', 'desc')
      .limit(10)
      .get();
    const reviews = ratingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ profile, listings, reviews });
  } catch (err) {
    console.error('[profile GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
