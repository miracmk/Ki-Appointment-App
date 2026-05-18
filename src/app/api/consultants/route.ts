import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { PublicConsultantInfo } from '@/types/marketplace';

export async function GET() {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('users')
      .where('role', '==', 'consultant')
      .where('is_active', '==', true)
      .get();

    const consultants: PublicConsultantInfo[] = snapshot.docs
      .filter((doc) => doc.data().stripe_settings?.is_active === true)
      .map((doc) => ({
        uid: doc.id,
        name: doc.data().name,
        title: doc.data().title || 'Management Consultant',
        expertise: doc.data().expertise || '',
        photo_url: doc.data().photo_url || null,
      }));

    return NextResponse.json({ consultants });
  } catch (error: any) {
    console.error('Error fetching consultants:', error);
    return NextResponse.json({ consultants: [] }, { status: 200 });
  }
}
