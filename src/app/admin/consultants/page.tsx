'use client';

import { useEffect, useState } from 'react';
import { getFirestoreClient } from '@/lib/firebase-client';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { ConsultantProfile } from '@/types/marketplace';

export default function AdminConsultantsPage() {
  const [consultants, setConsultants] = useState<(ConsultantProfile & { id: string })[]>([]);
  const [loading, setLoading]         = useState(true);
  const [acting, setActing]           = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'consultant')));
      setConsultants(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ConsultantProfile) })));
      setLoading(false);
    })();
  }, []);

  const approveKyc = async (uid: string) => {
    setActing(uid);
    try {
      const res = await fetch('/api/admin/kyc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultantId: uid, action: 'approve' }) });
      if (res.ok) setConsultants((prev) => prev.map((c) => c.id === uid ? { ...c, kyc_status: 'verified' } : c));
    } finally { setActing(null); }
  };

  const rejectKyc = async (uid: string) => {
    setActing(uid);
    try {
      const res = await fetch('/api/admin/kyc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultantId: uid, action: 'reject', reason: rejectReason }) });
      if (res.ok) {
        setConsultants((prev) => prev.map((c) => c.id === uid ? { ...c, kyc_status: 'rejected', kyc_rejection_reason: rejectReason } : c));
        setRejectTarget(null);
        setRejectReason('');
      }
    } finally { setActing(null); }
  };

  const KYC_STYLES: Record<string, string> = {
    none: 'bg-white/5 text-white/40 border-white/10',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const KYC_LABELS: Record<string, string> = {
    none: 'None', pending: 'Pending', verified: 'Verified', rejected: 'Rejected',
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Consultants</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Name', 'Email', 'KYC', 'Payment Mode', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {consultants.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white">{c.name}</td>
                  <td className="px-4 py-3 text-white/60">{c.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-medium ${KYC_STYLES[c.kyc_status] ?? KYC_STYLES.none}`}>
                      {KYC_LABELS[c.kyc_status] ?? c.kyc_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/50">{c.payment_mode ?? '—'}</td>
                  <td className="px-4 py-3">
                    {c.kyc_status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => approveKyc(c.id)}
                          disabled={acting === c.id}
                          className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectTarget(c.id)}
                          className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {rejectTarget === c.id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason for rejection…"
                          className="input-dark flex-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => rejectKyc(c.id)}
                          disabled={acting === c.id || !rejectReason}
                          className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-400 disabled:opacity-50"
                        >
                          Submit
                        </button>
                        <button type="button" onClick={() => setRejectTarget(null)} className="text-xs text-white/30">Cancel</button>
                      </div>
                    )}
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
