'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, getCountFromServer } from 'firebase/firestore';
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

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <p className="text-sm text-white/40">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ─── Client / Consultant view ────────────────────────────────────────────────

function ClientOverview() {
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

  const now      = Date.now();
  const upcoming = appointments.filter((a) => a.status === 'confirmed' && new Date(a.appointment_date).getTime() > now);
  const totalPaid = appointments.filter((a) => a.status !== 'cancelled').reduce((s, a) => s + a.payment_amount, 0);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" /></div>;

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Upcoming Sessions" value={upcoming.length} color="text-[#00F0FF]" />
        <StatCard label="Total Appointments" value={appointments.length} color="text-white" />
        <StatCard label="Total Spent" value={`$${(totalPaid / 100).toLocaleString()}`} color="text-emerald-400" />
      </div>

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
            {upcoming.slice(0, 5).map((appt) => (
              <div key={appt.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="font-medium text-white">{appt.package_name}</p>
                  <p className="mt-0.5 text-sm text-white/40">
                    {appt.consultant_name ?? 'Consultant'} · {appt.appointment_date} {appt.appointment_time}
                  </p>
                  {appt.meet_link && (
                    <a href={appt.meet_link} target="_blank" rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-[#00F0FF] hover:opacity-80">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.869V15.13a1 1 0 01-1.447.894L15 14M3 8h12a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2V10a2 2 0 012-2z" />
                      </svg>
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
    </>
  );
}

// ─── Consultant view ──────────────────────────────────────────────────────────

function ConsultantOverview({ uid }: { uid: string }) {
  const [bookings, setBookings]     = useState<(FlatAppointment & { id: string })[]>([]);
  const [walletCents, setWallet]    = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }

      const [apptSnap, userSnap] = await Promise.all([
        getDocs(query(collection(db, 'appointments'), where('consultant_id', '==', uid))),
        getDocs(query(collection(db, 'users'), where('__name__', '==', uid))),
      ]);

      const appts = apptSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<FlatAppointment, 'id'>) }))
        .sort((a, b) => b.created_at - a.created_at);
      setBookings(appts);

      if (!userSnap.empty) {
        setWallet(userSnap.docs[0].data().ki_wallet_cents ?? 0);
      }
      setLoading(false);
    })();
  }, [uid]);

  const now      = Date.now();
  const upcoming = bookings.filter((b) => b.status === 'confirmed' && new Date(b.appointment_date).getTime() > now);
  const earned   = bookings.filter((b) => b.status === 'completed').reduce((s, b) => s + (b.consultant_payout_cents ?? b.payment_amount), 0);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" /></div>;

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Upcoming Bookings" value={upcoming.length} color="text-[#00F0FF]" />
        <StatCard label="Total Bookings" value={bookings.length} color="text-white" />
        <StatCard label="Total Earned" value={`$${(earned / 100).toLocaleString()}`} color="text-emerald-400" />
        <StatCard label="Ki Wallet Balance" value={walletCents !== null ? `$${(walletCents / 100).toFixed(2)}` : '—'} color="text-[#B000FF]" />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">Upcoming Sessions</h2>
          <Link href="/dashboard/appointments" className="text-sm text-[#00F0FF] hover:opacity-80">View All →</Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="py-8 text-center text-white/40">No upcoming sessions booked yet.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="font-medium text-white">{b.package_name}</p>
                  <p className="mt-0.5 text-sm text-white/40">{b.customer_name ?? b.customer_email} · {b.appointment_date} {b.appointment_time}</p>
                </div>
                <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[b.status] ?? ''}`}>
                  {STATUS_LABELS[b.status] ?? b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Admin / Supervisor view ──────────────────────────────────────────────────

function ManagementOverview() {
  const [kpis, setKpis] = useState({ appointments: 0, revenue: 0, kycPending: 0, consultants: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      try {
        const [apptSnap, kycSnap, consultantSnap] = await Promise.all([
          getCountFromServer(collection(db, 'appointments')),
          getCountFromServer(query(collection(db, 'kyc_applications'), where('status', '==', 'pending'))),
          getCountFromServer(query(collection(db, 'users'), where('role', '==', 'consultant'))),
        ]);
        const allAppts = await getDocs(collection(db, 'appointments'));
        const revenue  = allAppts.docs.reduce((s, d) => {
          const data = d.data() as FlatAppointment;
          return data.status !== 'cancelled' ? s + (data.payment_amount ?? 0) : s;
        }, 0);
        setKpis({
          appointments: apptSnap.data().count,
          revenue,
          kycPending:   kycSnap.data().count,
          consultants:  consultantSnap.data().count,
        });
      } catch { /* firestore unavailable */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" /></div>;

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Appointments" value={kpis.appointments} color="text-white" />
        <StatCard label="Platform Revenue" value={`$${(kpis.revenue / 100).toLocaleString()}`} color="text-emerald-400" />
        <StatCard label="KYC Pending" value={kpis.kycPending} color="text-yellow-400" />
        <StatCard label="Active Consultants" value={kpis.consultants} color="text-[#00F0FF]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: '/dashboard/settings?tab=consultants', label: 'Manage Consultants', desc: 'Review KYC, manage profiles', icon: '👤', color: 'border-[#00F0FF]/20 bg-[#00F0FF]/5 text-[#00F0FF]' },
          { href: '/dashboard/wallet',                    label: 'Ki Wallet',          desc: 'View all balances, edit',    icon: '💳', color: 'border-[#B000FF]/20 bg-[#B000FF]/5 text-[#B000FF]' },
          { href: '/dashboard/settings?tab=platform',    label: 'Platform Config',    desc: 'Stripe, fees, settings',     icon: '⚙️', color: 'border-red-500/20 bg-red-500/5 text-red-400' },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className={`rounded-2xl border p-5 transition hover:opacity-80 ${item.color}`}>
            <div className="mb-2 text-2xl">{item.icon}</div>
            <p className="font-semibold">{item.label}</p>
            <p className="mt-0.5 text-xs opacity-60">{item.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardOverviewPage() {
  const { user, loading } = useUserRole();
  const [uid, setUid]     = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  if (loading) return null;

  const isManagement = user?.role === 'admin' || user?.role === 'supervisor';
  const isConsultant = user?.role === 'consultant';

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">
        {isManagement ? 'Platform Overview' : 'Overview'}
      </h1>
      {isManagement
        ? <ManagementOverview />
        : isConsultant && uid
          ? <ConsultantOverview uid={uid} />
          : <ClientOverview />
      }
    </div>
  );
}
