import { NextResponse, type NextRequest } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { ConsultantProfile, PublicConsultantInfo } from '@/types/marketplace';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const db      = getAdminFirestore();
    const doc     = await db.collection('users').doc(uid).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Consultant not found' }, { status: 404 });
    }

    const d = doc.data() as ConsultantProfile;

    if (d.role !== 'consultant' || !d.is_active) {
      return NextResponse.json({ error: 'Consultant not available' }, { status: 404 });
    }

    const info: PublicConsultantInfo = {
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
    };

    return NextResponse.json({ consultant: info });
  } catch (err) {
    console.error('GET /api/marketplace/consultants/[uid] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
