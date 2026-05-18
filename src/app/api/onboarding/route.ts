import { NextResponse, NextRequest } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { OnboardingProfile } from '@/types/marketplace';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const auth = getAdminAuth();

    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Geçersiz token.' }, { status: 401 });
    }

    if (!decoded.email_verified) {
      return NextResponse.json(
        { error: 'Email adresinizi onaylamanız gerekiyor. Lütfen emailinizi kontrol edin.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { appointment_id, first_name, last_name, company, sector, employee_count, description } =
      body;

    if (!first_name || !last_name || !company || !sector || !employee_count) {
      return NextResponse.json({ error: 'Zorunlu alanları doldurun.' }, { status: 400 });
    }

    const db = getAdminFirestore();

    const profile: OnboardingProfile = {
      uid: decoded.uid,
      customer_email: decoded.email!,
      appointment_id: appointment_id || '',
      first_name,
      last_name,
      company,
      sector,
      employee_count,
      description: description || '',
      submitted_at: Date.now(),
    };

    await db.collection('onboarding').doc(decoded.uid).set(profile);

    if (appointment_id) {
      await db.collection('appointments').doc(appointment_id).update({
        onboarding_status: 'complete',
        updated_at: Date.now(),
      }).catch(() => {});
    }

    await db.collection('users').doc(decoded.uid).set(
      { onboarding_status: 'complete', updated_at: Date.now() },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Onboarding hatası:', err);
    return NextResponse.json({ error: err.message || 'Sunucu hatası.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await getAdminAuth().verifyIdToken(token);

    const db = getAdminFirestore();
    const doc = await db.collection('onboarding').doc(decoded.uid).get();

    if (!doc.exists) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile: doc.data() });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası.' }, { status: 500 });
  }
}
