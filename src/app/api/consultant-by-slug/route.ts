import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  try {
    const db = getAdminFirestore();
    const usersSnapshot = await db.collection('users').where('slug', '==', slug).limit(1).get();
    if (usersSnapshot.empty) {
      return NextResponse.json({ error: 'Consultant not found' }, { status: 404 });
    }

    const user = usersSnapshot.docs[0].data();
    return NextResponse.json({ consultant: user });
  } catch (error) {
    console.error('[api/consultant-by-slug]', error);
    return NextResponse.json({ error: 'Unable to fetch consultant' }, { status: 500 });
  }
}
