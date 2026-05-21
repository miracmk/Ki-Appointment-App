import { NextResponse, type NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { ConsultantListing, MarketplaceCategory } from '@/types/marketplace';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category  = searchParams.get('category') as MarketplaceCategory | null;
    const minPrice  = searchParams.get('minPrice');
    const maxPrice  = searchParams.get('maxPrice');
    const lang      = searchParams.get('lang');
    const limit     = Math.min(parseInt(searchParams.get('limit') ?? '60'), 100);

    const db = getAdminFirestore();
    let query: FirebaseFirestore.Query = db.collection('consultant_listings')
      .where('is_active', '==', true);

    if (category) query = query.where('category', '==', category);

    const snap = await query.limit(limit).get();

    // Collect unique consultant IDs
    const listings = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ConsultantListing, 'id'>),
    }));

    const consultantIds = [...new Set(listings.map((l) => l.consultant_id))];

    // Batch-fetch consultant profiles
    const profileMap: Record<string, {
      photo_url?: string;
      rating?: number;
      review_count?: number;
      kyc_status?: string;
      languages?: string[];
      title?: string;
      location?: string;
    }> = {};

    if (consultantIds.length > 0) {
      const profileSnaps = await Promise.all(
        consultantIds.map((uid) => db.collection('users').doc(uid).get())
      );
      profileSnaps.forEach((snap) => {
        if (snap.exists) {
          const d = snap.data()!;
          profileMap[snap.id] = {
            photo_url:    d.photo_url,
            rating:       d.rating ?? 0,
            review_count: d.review_count ?? 0,
            kyc_status:   d.kyc_status ?? 'none',
            languages:    d.languages ?? [],
            title:        d.title,
            location:     d.location,
          };
        }
      });
    }

    // Merge + apply client-side filters
    let result = listings.map((l) => ({
      ...l,
      ...(profileMap[l.consultant_id] ?? {}),
    }));

    if (minPrice) result = result.filter((l) => l.pricing.amount_cents >= parseInt(minPrice) * 100);
    if (maxPrice) result = result.filter((l) => l.pricing.amount_cents <= parseInt(maxPrice) * 100);
    if (lang) {
      const wanted = lang.split(',').map((x) => x.toLowerCase());
      result = result.filter((l) => {
        const langs = ((l as { languages?: string[] }).languages ?? []).map((x: string) => x.toLowerCase());
        return wanted.some((w) => langs.includes(w));
      });
    }

    // Sort: KYC verified first, then by created_at desc
    result.sort((a, b) => {
      const aVerified = (a as { kyc_status?: string }).kyc_status === 'verified' ? 1 : 0;
      const bVerified = (b as { kyc_status?: string }).kyc_status === 'verified' ? 1 : 0;
      if (bVerified !== aVerified) return bVerified - aVerified;
      return b.created_at - a.created_at;
    });

    return NextResponse.json({ listings: result });
  } catch (err) {
    console.error('GET /api/marketplace/listings error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
