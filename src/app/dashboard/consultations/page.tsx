'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useUserRole } from '@/lib/use-user-role';
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

const PAYMENT_MODE_LABELS: Record<string, string> = {
  ki_escrow:  'Ki Escrow',
  own_keys:   'Own Stripe',
  ki_connect: 'Ki Connect',
  direct:     'Ki Business Direct',
};

export default function ConsultationsPage() {
  const { user } = useUserRole();
  const [consultations, setConsultations] = useState<(FlatAppointment & { id: string })[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { setLoading(false); return; }
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }

      let q;
      const isConsultant = user?.role === 'consultant';
      const isManagement = user?.role === 'admin' || user?.role === 'supervisor';

      if (isManagement) {
        q = query(collection(db, 'appointments'));
      } else if (isConsultant) {
        q = query(collection(db, 'appointments'), where('consultant_id', '==', firebaseUser.uid));
      } else {
        q = query(collection(db, 'appointments'), where('customer_email', '==', firebaseUser.email));
      }

      const snap = await getDocs(q);
      const data = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<FlatAppointment, 'id'>) }))
        .sort((a, b) => b.created_at - a.created_at);
      setConsultations(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.role]);

  const filtered = consultations.filter((c) => {
    if (filter === 'active')    return c.status === 'confirmed' || c.status === 'pending';
    if (filter === 'completed') return c.status === 'completed';
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Consultations</h1>
          <p className="mt-1 text-sm text-white/40">
            {user?.role === 'consultant' ? 'Your client sessions and bookings.' : 'Your consultation sessions with experts.'}
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium capitalize transition ${
                filter === f
                  ? 'border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF]'
                  : 'border-white/10 bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-16 text-center">
          <p className="text-white/40">No consultations found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{c.package_name}</h3>
                    <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status] ?? 'border-white/10 bg-white/5 text-white/50'}`}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                    {c.payment_mode && (
                      <span className="rounded-lg border border-[#B000FF]/20 bg-[#B000FF]/10 px-2.5 py-0.5 text-xs text-[#B000FF]">
                        {PAYMENT_MODE_LABELS[c.payment_mode] ?? c.payment_mode}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1">
                    {user?.role !== 'client' && c.customer_name && (
                      <p className="text-sm text-white/50">
                        <span className="text-white/30">Client:</span> {c.customer_name} ({c.customer_email})
                      </p>
                    )}
                    {user?.role === 'client' && c.consultant_name && (
                      <p className="text-sm text-white/50">
                        <span className="text-white/30">Consultant:</span> {c.consultant_name}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 text-sm text-white/40">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {c.appointment_date} at {c.appointment_time}
                      {c.appointment_timezone && <span className="text-white/25">({c.appointment_timezone})</span>}
                    </p>
                  </div>

                  {c.meet_link && (
                    <a
                      href={c.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-3 py-1.5 text-xs font-medium text-[#00F0FF] transition hover:bg-[#00F0FF]/20"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.869V15.13a1 1 0 01-1.447.894L15 14M3 8h12a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2V10a2 2 0 012-2z" />
                      </svg>
                      Join Video Call
                    </a>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xl font-bold text-white">${(c.payment_amount / 100).toLocaleString()}</p>
                  <p className="text-xs text-white/30">total paid</p>
                  {c.consultant_payout_cents != null && user?.role !== 'client' && (
                    <p className="mt-1 text-sm text-emerald-400">
                      ${(c.consultant_payout_cents / 100).toLocaleString()} payout
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
