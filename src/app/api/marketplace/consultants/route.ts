import { NextResponse, type NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { ConsultantProfile, PublicConsultantInfo, MarketplaceCategory } from '@/types/marketplace';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category  = searchParams.get('category') as MarketplaceCategory | null;
    const lang      = searchParams.get('lang');
    const minRate   = searchParams.get('minRate');
    const maxRate   = searchParams.get('maxRate');
    const minRating = searchParams.get('rating');

    const db   = getAdminFirestore();
    let query  = db.collection('users')
      .where('role', 'in', ['consultant'])
      .where('is_active', '==', true)
      .where('kyc_status', '==', 'verified') as FirebaseFirestore.Query;

    if (category) {
      query = query.where('categories', 'array-contains', category);
    }

    const snapshot = await query.limit(100).get();
    let consultants: PublicConsultantInfo[] = [];

    snapshot.forEach((doc) => {
      const d = doc.data() as ConsultantProfile;

      if (minRate && d.hourly_rate_cents < Number(minRate) * 100) return;
      if (maxRate && Number(maxRate) < 500 && d.hourly_rate_cents > Number(maxRate) * 100) return;
      if (minRating && d.rating < Number(minRating)) return;
      if (lang) {
        const wanted = lang.split(',');
        if (!wanted.some((l) => d.languages?.includes(l))) return;
      }

      consultants.push({
        uid:               doc.id,
        name:              d.name,
        title:             d.title,
        bio:               d.bio,
        photo_url:         d.photo_url,
        categories:        d.categories ?? [],
        sub_specialties:   d.sub_specialties ?? [],
        languages:         d.languages ?? [],
        hourly_rate_cents: d.hourly_rate_cents ?? 0,
        rating:            d.rating ?? 0,
        review_count:      d.review_count ?? 0,
        location:          d.location,
        kyc_status:        d.kyc_status,
        is_ki_business:    d.is_ki_business,
      });
    });

    // Sort by rating desc
    consultants.sort((a, b) => b.rating - a.rating);

    return NextResponse.json({ consultants });
  } catch (err) {
    console.error('GET /api/marketplace/consultants error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
