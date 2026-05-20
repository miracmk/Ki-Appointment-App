'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { FlatAppointment } from '@/types/marketplace';

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled', completed: 'Completed',
};

export default function BillingPage() {
  const [appointments, setAppointments] = useState<(FlatAppointment & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

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
        .filter((a) => a.status !== 'cancelled')
        .sort((a, b) => b.created_at - a.created_at);
      setAppointments(appts);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDownload = async (apptId: string) => {
    setDownloading(apptId);
    try {
      const res = await fetch(`/api/receipts/${apptId}`);
      if (!res.ok) throw new Error('Receipt unavailable');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `receipt-${apptId}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setDownloading(null);
    }
  };

  const total = appointments.reduce((s, a) => s + a.payment_amount, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-right">
          <p className="text-xs text-white/40">Total Spent</p>
          <p className="text-lg font-bold text-emerald-400">${(total / 100).toLocaleString()}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-16 text-center">
          <p className="text-white/40">No payment records yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Package</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Consultant</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {appointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white/60">
                    {new Date(appt.created_at).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-4 py-3 text-white">{appt.package_name}</td>
                  <td className="px-4 py-3 text-white/60">{appt.consultant_name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-white">${(appt.payment_amount / 100).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/60">
                      {STATUS_LABELS[appt.status] ?? appt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDownload(appt.id)}
                      disabled={downloading === appt.id}
                      className="text-xs text-[#00F0FF] hover:opacity-80 disabled:opacity-40"
                    >
                      {downloading === appt.id ? 'Downloading…' : 'Download Receipt'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
