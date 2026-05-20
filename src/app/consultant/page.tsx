'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { ConsultantProfile, FlatAppointment } from '@/types/marketplace';

export default function ConsultantOverview() {
  const [profile, setProfile]         = useState<ConsultantProfile | null>(null);
  const [appointments, setAppointments] = useState<FlatAppointment[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const [profileDoc, apptSnap] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDocs(query(collection(db, 'appointments'), where('consultant_id', '==', user.uid))),
      ]);
      if (profileDoc.exists()) setProfile(profileDoc.data() as ConsultantProfile);
      setAppointments(apptSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FlatAppointment, 'id'>) })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return null;

  const now      = Date.now();
  const upcoming = appointments.filter((a) => a.status === 'confirmed' && new Date(a.appointment_date).getTime() > now);
  const totalRevenue = appointments.filter((a) => a.status !== 'cancelled')
    .reduce((s, a) => s + (a.consultant_payout_cents ?? a.payment_amount), 0);

  const kycPending = profile?.kyc_status !== 'verified';

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">
        Welcome back{profile?.name ? `, ${profile.name}` : ''}
      </h1>

      {/* KYC banner */}
      {kycPending && (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-yellow-300">KYC Verification Required</p>
              <p className="mt-0.5 text-sm text-yellow-400/70">
                {profile?.kyc_status === 'pending'
                  ? 'Your application is under review. This typically takes 1–3 business days.'
                  : 'Complete your KYC verification to appear on the marketplace.'}
              </p>
            </div>
          </div>
          <Link href="/consultant/kyc" className="shrink-0 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-sm font-medium text-yellow-400 transition hover:bg-yellow-500/20">
            Start KYC
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: 'Upcoming Sessions',  value: upcoming.length,    color: 'text-[#B000FF]' },
          { label: 'Total Appointments', value: appointments.length, color: 'text-white' },
          { label: 'Estimated Revenue',  value: `$${(totalRevenue / 100).toLocaleString()}`, color: 'text-emerald-400' },
          { label: 'Ki Wallet',          value: `$${((profile?.ki_wallet_cents ?? 0) / 100).toFixed(2)}`, color: 'text-[#00F0FF]' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="text-sm text-white/40">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[
          { href: '/consultant/profile',       label: 'Edit Profile',         icon: '👤' },
          { href: '/consultant/availability',  label: 'Set Availability',     icon: '📅' },
          { href: '/consultant/payments',      label: 'Payment Settings',     icon: '💳' },
          { href: '/consultant/integrations',  label: 'Integrations',         icon: '🔗' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-center transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm font-medium text-white/70">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
