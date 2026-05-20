'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { detectUserTimezone, formatAppointmentDateTime } from '@/lib/timezone';
import type { FlatAppointment } from '@/types/marketplace';

const TABS = [
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'past',      label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  completed: 'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/20',
};
const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled', completed: 'Completed',
};

type Tab = typeof TABS[number]['key'];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<(FlatAppointment & { id: string })[]>([]);
  const [tab, setTab]       = useState<Tab>('upcoming');
  const [loading, setLoading] = useState(true);
  const [clientTz, setClientTz] = useState('UTC');

  useEffect(() => {
    setClientTz(detectUserTimezone());
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

  const now = Date.now();
  const filtered = appointments.filter((a) => {
    const apptTime = new Date(a.appointment_date).getTime();
    if (tab === 'upcoming')  return a.status !== 'cancelled' && apptTime > now;
    if (tab === 'past')      return a.status !== 'cancelled' && apptTime <= now;
    if (tab === 'cancelled') return a.status === 'cancelled';
    return true;
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">My Appointments</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? 'border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF]'
                : 'border-white/10 bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-16 text-center">
          <p className="text-white/40">No appointments found in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((appt) => {
            const consultantTz = appt.appointment_timezone || 'UTC';
            const { clientDisplay } = formatAppointmentDateTime(
              appt.appointment_date,
              appt.appointment_time,
              consultantTz,
              clientTz
            );
            return (
              <div key={appt.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-white">{appt.package_name}</h3>
                      <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[appt.status] ?? ''}`}>
                        {STATUS_LABELS[appt.status] ?? appt.status}
                      </span>
                    </div>
                    {appt.consultant_name && (
                      <p className="mt-1 text-sm text-white/50">Consultant: {appt.consultant_name}</p>
                    )}
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-white/40">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {clientDisplay}
                    </p>
                    {appt.meet_link && (
                      <a
                        href={appt.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-3 py-1.5 text-xs font-medium text-[#00F0FF] transition hover:bg-[#00F0FF]/20"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.869V15.13a1 1 0 01-1.447.894L15 14M3 8h12a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2V10a2 2 0 012-2z" />
                        </svg>
                        Join Video Call
                      </a>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-white">${(appt.payment_amount / 100).toLocaleString()}</p>
                    <p className="text-xs text-white/30">paid</p>
                    {appt.onboarding_status === 'form_pending' && (
                      <a
                        href="/onboarding"
                        className="mt-2 inline-block text-xs font-medium text-orange-400 hover:text-orange-300"
                      >
                        Complete Onboarding Form →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
