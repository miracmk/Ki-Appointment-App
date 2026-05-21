import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin';
import { getConsultantProfile } from '@/lib/marketplace';
import { sendClientBookingConfirmed } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const db      = getAdminFirestore();

    // Find appointment in the consultant's sub-collection
    const apptRef = db
      .collection('consultants').doc(decoded.uid)
      .collection('appointments').doc(params.id);
    const appt = await apptRef.get();

    if (!appt.exists) {
      // Fall back to flat appointments collection
      const flatRef  = db.collection('appointments').doc(params.id);
      const flatAppt = await flatRef.get();
      if (!flatAppt.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const fd = flatAppt.data()!;
      if (fd.consultant_id !== decoded.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      await flatRef.update({ status: 'confirmed', updated_at: Date.now() });
      return NextResponse.json({ success: true });
    }

    const data = appt.data()!;
    if (data.consultant_id !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await apptRef.update({ status: 'confirmed', updated_at: Date.now() });

    // Mirror to flat collection if present
    const flatRef = db.collection('appointments').doc(params.id);
    const flat    = await flatRef.get();
    if (flat.exists) await flatRef.update({ status: 'confirmed', updated_at: Date.now() });

    // Send confirmation email to client
    const consultant = await getConsultantProfile(decoded.uid);
    await sendClientBookingConfirmed({
      clientEmail:         data.customer_email,
      clientName:          data.customer_name ?? '',
      consultantName:      consultant?.name ?? 'Your consultant',
      consultantEmail:     consultant?.email ?? '',
      listingTitle:        data.listing_title ?? 'Consultation',
      appointmentDate:     data.appointment_date,
      appointmentTime:     data.appointment_time,
      appointmentTimezone: data.appointment_timezone ?? 'UTC',
      durationMinutes:     data.duration_minutes ?? 60,
      meetLink:            consultant?.meet_link,
    }).catch((e) => console.error('[email] confirm send failed:', e));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Appointment confirm error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
