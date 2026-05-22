'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { detectUserTimezone, formatAppointmentDateTime } from '@/lib/timezone';
import type { FlatAppointment } from '@/types/marketplace';
import Link from 'next/link';

const TABS = [
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'past',      label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  pending:   'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  completed: 'bg-ki-primary/10 text-ki-primary border-ki-primary/20',
};
const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled', completed: 'Completed',
};

type Tab = typeof TABS[number]['key'];

type AppointmentWithMeta = FlatAppointment & {
  id: string;
  rated?: boolean;
  listing_id?: string;
};

type RatingState = {
  stars: number;
  comment: string;
  submitting: boolean;
  submitted: boolean;
  error: string | null;
};

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
        >
          <svg
            className={`h-7 w-7 transition-colors ${(hovered || value) >= n ? 'text-yellow-400' : 'text-[var(--text-muted)]'}`}
            fill={(hovered || value) >= n ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
      {value > 0 && (
        <span className="ml-1 text-sm text-[var(--text-secondary)]">
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value]}
        </span>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentWithMeta[]>([]);
  const [tab, setTab]       = useState<Tab>('upcoming');
  const [loading, setLoading] = useState(true);
  const [clientTz, setClientTz] = useState('UTC');

  const [ratingState, setRatingState] = useState<Record<string, RatingState>>({});

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
        .map((d) => ({ id: d.id, ...(d.data() as Omit<FlatAppointment, 'id'>) } as AppointmentWithMeta))
        .sort((a, b) => b.created_at - a.created_at);
      setAppointments(appts);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const now = Date.now();
  const filtered = appointments.filter((a) => {
    const apptTime = new Date(a.appointment_date + 'T12:00:00').getTime();
    if (tab === 'upcoming')  return a.status !== 'cancelled' && apptTime > now;
    if (tab === 'past')      return a.status !== 'cancelled' && apptTime <= now;
    if (tab === 'cancelled') return a.status === 'cancelled';
    return true;
  });

  const updateRating = (id: string, patch: Partial<RatingState>) =>
    setRatingState(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const submitRating = async (appt: AppointmentWithMeta) => {
    const state = ratingState[appt.id];
    if (!state || state.stars < 1) return;
    updateRating(appt.id, { submitting: true, error: null });

    try {
      const auth = getFirebaseAuth();
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          consultantId:  appt.consultant_id,
          appointmentId: appt.id,
          listingId:     appt.listing_id ?? null,
          rating:        state.stars,
          comment:       state.comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit rating');

      updateRating(appt.id, { submitted: true, submitting: false });
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, rated: true } : a));
    } catch (err: any) {
      updateRating(appt.id, { submitting: false, error: err.message ?? 'Error submitting rating' });
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">My Appointments</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? 'border-ki-primary/50 bg-ki-primary/10 text-ki-primary'
                : 'border-white/10 bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ki-primary border-t-transparent" />
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
            const isCompleted     = appt.status === 'completed';
            const canRate         = isCompleted && !appt.rated && tab === 'past';
            const rs              = ratingState[appt.id] ?? { stars: 0, comment: '', submitting: false, submitted: false, error: null };

            return (
              <div key={appt.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                <div className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-white">{appt.package_name}</h3>
                        <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[appt.status] ?? ''}`}>
                          {STATUS_LABELS[appt.status] ?? appt.status}
                        </span>
                      </div>
                      {appt.consultant_name && (
                        <p className="mt-1 text-sm text-white/50">
                          Consultant:{' '}
                          <Link href={`/profile/${appt.consultant_id}`} className="text-ki-primary hover:underline">
                            {appt.consultant_name}
                          </Link>
                        </p>
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
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-ki-primary/20 bg-ki-primary/10 px-3 py-1.5 text-xs font-medium text-ki-primary transition hover:bg-ki-primary/20"
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
                          Complete Onboarding →
                        </a>
                      )}
                      {appt.rated && (
                        <div className="mt-2 flex items-center justify-end gap-1 text-xs text-yellow-400">
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Rated
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rating widget — completed, unrated appointments in past tab */}
                {canRate && (
                  <div className="border-t border-ki-primary/10 bg-ki-primary/[0.03] px-5 py-4">
                    {rs.submitted ? (
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Thank you for your review!
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                          Rate your session with {appt.consultant_name ?? 'this consultant'}
                        </p>
                        <StarPicker
                          value={rs.stars}
                          onChange={(n) => updateRating(appt.id, { stars: n })}
                        />
                        {rs.stars > 0 && (
                          <>
                            <textarea
                              value={rs.comment}
                              onChange={e => updateRating(appt.id, { comment: e.target.value })}
                              placeholder="Share your experience (optional)…"
                              rows={2}
                              className="input-ki resize-none text-sm"
                            />
                            {rs.error && (
                              <p className="text-xs text-red-400">{rs.error}</p>
                            )}
                            <button
                              type="button"
                              onClick={() => submitRating(appt)}
                              disabled={rs.submitting}
                              className="rounded-xl bg-ki-gradient px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                            >
                              {rs.submitting ? 'Submitting…' : 'Submit Review'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
