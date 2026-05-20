'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import type { KycApplication } from '@/types/marketplace';

interface KycRow extends KycApplication {
  id: string;
  // User display fields fetched separately
  userEmail?: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function AdminConsultantsPage() {
  const [applications, setApplications] = useState<KycRow[]>([]);
  const [consultants, setConsultants]   = useState<{ id: string; email: string; displayName?: string; kycStatus?: string }[]>([]);
  const [tab, setTab] = useState<'kyc' | 'active'>('kyc');
  const [loading, setLoading] = useState(true);
  const [token, setToken]     = useState<string | null>(null);
  const [acting, setActing]   = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      const idToken = await user.getIdToken();
      setToken(idToken);

      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }

      // Load KYC applications
      const kycSnap = await getDocs(
        query(collection(db, 'kyc_applications'), orderBy('submittedAt', 'desc'))
      );
      setApplications(kycSnap.docs.map((d) => ({ id: d.id, ...(d.data() as KycApplication) })));

      // Load active consultants
      const consultantSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'consultant'))
      );
      setConsultants(consultantSnap.docs.map((d) => ({
        id: d.id,
        email: d.data().email ?? '',
        displayName: d.data().displayName ?? d.data().name,
        kycStatus: d.data().kycStatus ?? d.data().kyc_status,
      })));

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const callAdminKyc = async (body: Record<string, string>) => {
    if (!token) return;
    const res = await fetch('/api/admin/kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const handleApprove = async (userId: string) => {
    setActing(userId);
    setFeedback(null);
    try {
      const data = await callAdminKyc({ userId, action: 'approve' });
      if (data?.success) {
        setApplications((prev) => prev.map((a) => a.id === userId ? { ...a, status: 'approved' } : a));
        setFeedback({ ok: true, message: data.message });
      } else {
        setFeedback({ ok: false, message: data?.error ?? 'Failed' });
      }
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!rejectReason.trim()) return;
    setActing(userId);
    setFeedback(null);
    try {
      const data = await callAdminKyc({ userId, action: 'reject', rejectionReason: rejectReason });
      if (data?.success) {
        setApplications((prev) => prev.map((a) => a.id === userId ? { ...a, status: 'rejected', rejectionReason: rejectReason } : a));
        setRejectTarget(null);
        setRejectReason('');
        setFeedback({ ok: true, message: data.message });
      } else {
        setFeedback({ ok: false, message: data?.error ?? 'Failed' });
      }
    } finally {
      setActing(null);
    }
  };

  const pending  = applications.filter((a) => a.status === 'pending').length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Consultants</h1>
        {pending > 0 && (
          <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-400">
            {pending} pending review
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 w-fit">
        {([['kyc', 'KYC Applications'], ['active', 'Active Consultants']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mb-4 rounded-xl border p-3 text-sm ${feedback.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
          {feedback.message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
        </div>
      ) : tab === 'kyc' ? (
        /* ── KYC Applications ── */
        applications.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center text-white/40">
            No KYC applications yet.
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{app.firstName} {app.lastName}</p>
                      <span className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[app.status] ?? STATUS_STYLE.pending}`}>
                        {app.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-white/40">UID: {app.userId}</p>
                    <p className="text-xs text-white/40">National ID: {app.nationalId} · DOB: {app.dateOfBirth}</p>
                    {app.documentUrls?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {app.documentUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#00F0FF] underline">
                            Document {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                    {app.rejectionReason && (
                      <p className="mt-1 text-xs text-red-400">Rejection reason: {app.rejectionReason}</p>
                    )}
                    <p className="mt-1 text-xs text-white/30">
                      Submitted: {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}
                    </p>
                  </div>

                  {app.status === 'pending' && (
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(app.id)}
                        disabled={acting === app.id}
                        className="rounded-lg bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        {acting === app.id ? 'Processing…' : 'Approve & Promote'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectTarget(app.id); setRejectReason(''); }}
                        className="rounded-lg bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline rejection form */}
                {rejectTarget === app.id && (
                  <div className="mt-3 flex gap-2 border-t border-white/[0.06] pt-3">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection…"
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-red-400/40"
                    />
                    <button
                      type="button"
                      onClick={() => handleReject(app.id)}
                      disabled={acting === app.id || !rejectReason.trim()}
                      className="rounded-xl bg-red-500/20 px-3 py-2 text-xs text-red-400 disabled:opacity-50"
                    >
                      Submit
                    </button>
                    <button type="button" onClick={() => setRejectTarget(null)} className="text-xs text-white/30 hover:text-white">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── Active Consultants ── */
        consultants.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center text-white/40">
            No active consultants yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Name / UID', 'Email', 'KYC Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {consultants.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="text-white">{c.displayName ?? '—'}</p>
                      <p className="text-xs text-white/30">{c.id}</p>
                    </td>
                    <td className="px-4 py-3 text-white/60">{c.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[c.kycStatus ?? 'pending'] ?? STATUS_STYLE.pending}`}>
                        {c.kycStatus ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
