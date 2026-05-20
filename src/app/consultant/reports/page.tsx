'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { FlatAppointment } from '@/types/marketplace';

export default function ReportsPage() {
  const [appointments, setAppointments] = useState<FlatAppointment[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const snap = await getDocs(query(collection(db, 'appointments'), where('consultant_id', '==', user.uid)));
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FlatAppointment, 'id'>) })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B000FF] border-t-transparent" />
      </div>
    );
  }

  const confirmed = appointments.filter((a) => a.status !== 'cancelled');
  const totalGross = confirmed.reduce((s, a) => s + a.payment_amount, 0);
  const totalPayout = confirmed.reduce((s, a) => s + (a.consultant_payout_cents ?? 0), 0);
  const totalPlatformFee = confirmed.reduce((s, a) => s + (a.platform_fee_cents ?? 0), 0);

  // Group by month
  const byMonth: Record<string, { count: number; gross: number; payout: number }> = {};
  for (const appt of confirmed) {
    const d    = new Date(appt.created_at);
    const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { count: 0, gross: 0, payout: 0 };
    byMonth[key].count++;
    byMonth[key].gross  += appt.payment_amount;
    byMonth[key].payout += appt.consultant_payout_cents ?? 0;
  }
  const months = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Reports</h1>

      {/* Totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Revenue',      value: `$${(totalGross / 100).toLocaleString()}`,     color: 'text-white' },
          { label: 'Total Earnings',     value: `$${(totalPayout / 100).toLocaleString()}`,    color: 'text-emerald-400' },
          { label: 'Platform Fee',       value: `$${(totalPlatformFee / 100).toLocaleString()}`, color: 'text-[#B000FF]' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="text-sm text-white/40">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly breakdown */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="font-semibold text-white">Monthly Summary</h2>
        </div>
        {months.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/30">No data available yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Month</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Appointments</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Revenue</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {months.map(([month, data]) => (
                <tr key={month} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3 text-white">{month}</td>
                  <td className="px-5 py-3 text-white/60">{data.count}</td>
                  <td className="px-5 py-3 text-white">${(data.gross / 100).toLocaleString()}</td>
                  <td className="px-5 py-3 font-semibold text-emerald-400">${(data.payout / 100).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
