'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { FlatAppointment } from '@/types/marketplace';

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  completed: 'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/20',
};
const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled', completed: 'Completed',
};

function formatDate(iso: string, time: string, tz: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { timeZone: tz || 'UTC', day: '2-digit', month: 'long', year: 'numeric' }) + ' ' + time;
  } catch { return `${iso} ${time}`; }
}

export default function DashboardOverview() {
  const [appointments, setAppointments] = useState<(FlatAppointment & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) { setLoading(false); return; }
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const snap = await getDocs(query(collection(db, 'appointments'), where('customer_email', '==', user.email)));
      const appts = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<FlatAppointment, 'id'>) }))
        .sort((a, b) => b.created_at - a.created_at);
      setAppointments(appts);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const now       = Date.now();
  const upcoming  = appointments.filter((a) => a.status === 'confirmed' && new Date(a.appointment_date).getTime() > now);
  const totalPaid = appointments.filter((a) => a.status !== 'cancelled').reduce((s, a) => s + a.payment_amount, 0);

  if (loading) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Overview</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Upcoming Sessions', value: upcoming.length, color: 'text-[#00F0FF]' },
          { label: 'Total Appointments', value: appointments.length, color: 'text-white' },
          { label: 'Total Spent', value: `$${(totalPaid / 100).toLocaleString()}`, color: 'text-emerald-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="text-sm text-white/40">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">Upcoming Appointments</h2>
          <Link href="/dashboard/appointments" className="text-sm text-[#00F0FF] hover:opacity-80">View All →</Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-white/40">No upcoming appointments.</p>
            <Link href="/marketplace" className="mt-3 inline-block text-sm text-[#00F0FF] hover:opacity-80">
              Find a Consultant →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 3).map((appt) => (
              <div key={appt.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="font-medium text-white">{appt.package_name}</p>
                  <p className="mt-0.5 text-sm text-white/40">{appt.consultant_name} · {formatDate(appt.appointment_date, appt.appointment_time, appt.appointment_timezone)}</p>
                  {appt.meet_link && (
                    <a href={appt.meet_link} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-xs text-[#00F0FF] hover:opacity-80">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.869V15.13a1 1 0 01-1.447.894L15 14M3 8h12a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2V10a2 2 0 012-2z" /></svg>
                      Join Video Call
                    </a>
                  )}
                </div>
                <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[appt.status] ?? ''}`}>
                  {STATUS_LABELS[appt.status] ?? appt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
