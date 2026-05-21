import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { WeeklyAvailability } from '@/types/marketplace';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { consultantId: string } }
) {
  try {
    const { consultantId } = params;
    const { searchParams }  = new URL(request.url);
    const dateStr           = searchParams.get('date');
    const durationMinutes   = Number(searchParams.get('duration') ?? 60);

    if (!consultantId || !dateStr) {
      return NextResponse.json({ error: 'consultantId and date required' }, { status: 400 });
    }

    const db   = getAdminFirestore();
    const snap = await db.collection('users').doc(consultantId).get();

    if (!snap.exists) {
      return NextResponse.json({ slots: [] });
    }

    const data         = snap.data()!;
    const availability = data.availability as WeeklyAvailability | undefined;

    if (!availability) {
      return NextResponse.json({ slots: [] });
    }

    const date    = new Date(dateStr + 'T00:00:00');
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey  = dayKeys[date.getDay()] as keyof WeeklyAvailability;
    const dayAvail = availability[dayKey];

    if (!dayAvail?.enabled) {
      return NextResponse.json({ slots: [] });
    }

    const apptSnap = await db
      .collection('consultants').doc(consultantId)
      .collection('appointments')
      .where('appointment_date', '>=', dateStr)
      .where('appointment_date', '<=', dateStr + 'T23:59:59.999Z')
      .get();

    const bookedTimes = new Set(
      apptSnap.docs
        .filter(d => d.data().status !== 'cancelled')
        .map(d => d.data().appointment_time as string)
    );

    const slots: { time: string; available: boolean }[] = [];
    const [startH, startM] = dayAvail.start.split(':').map(Number);
    const [endH,   endM  ] = dayAvail.end.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal   = endH   * 60 + endM;

    for (let t = startTotal; t + durationMinutes <= endTotal; t += 30) {
      const hh   = String(Math.floor(t / 60)).padStart(2, '0');
      const mm   = String(t % 60).padStart(2, '0');
      const time = `${hh}:${mm}`;
      slots.push({ time, available: !bookedTimes.has(time) });
    }

    return NextResponse.json({ slots, dayKey, start: dayAvail.start, end: dayAvail.end });
  } catch (err) {
    console.error('Availability error:', err);
    return NextResponse.json({ error: 'Could not fetch availability' }, { status: 500 });
  }
}
