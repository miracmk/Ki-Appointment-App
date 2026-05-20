'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useUserRole } from '@/lib/use-user-role';
import type { WalletTransaction, FlatAppointment } from '@/types/marketplace';

const TX_TYPE_LABELS: Record<string, string> = {
  topup_stripe:          'Top-up (Card)',
  topup_bank:            'Top-up (Bank)',
  deduction_platform_fee:'Platform Fee Deduction',
  refund:                'Refund',
};
const TX_SIGN: Record<string, string> = {
  topup_stripe: '+', topup_bank: '+', deduction_platform_fee: '-', refund: '+',
};
const TX_COLOR: Record<string, string> = {
  topup_stripe: 'text-emerald-400', topup_bank: 'text-emerald-400',
  deduction_platform_fee: 'text-red-400', refund: 'text-emerald-400',
};
const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled', completed: 'Completed',
};

// ─── Client Wallet (spend history) ───────────────────────────────────────────

function ClientWallet() {
  const [appointments, setAppointments] = useState<(FlatAppointment & { id: string })[]>([]);
  const [loading, setLoading]           = useState(true);
  const [downloading, setDownloading]   = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u?.email) { setLoading(false); return; }
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const snap = await getDocs(query(collection(db, 'appointments'), where('customer_email', '==', u.email)));
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
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `receipt-${apptId}.html`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  const total = appointments.reduce((s, a) => s + a.payment_amount, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Ki Wallet</h1>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-right">
          <p className="text-xs text-white/40">Total Spent</p>
          <p className="text-xl font-bold text-emerald-400">${(total / 100).toLocaleString()}</p>
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
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 sm:table-cell">Consultant</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Amount</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 sm:table-cell">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {appointments.map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white/60">{new Date(a.created_at).toLocaleDateString('en-US')}</td>
                  <td className="px-4 py-3 text-white">{a.package_name}</td>
                  <td className="hidden px-4 py-3 text-white/60 sm:table-cell">{a.consultant_name ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-white">${(a.payment_amount / 100).toLocaleString()}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/60">
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDownload(a.id)}
                      disabled={downloading === a.id}
                      className="text-xs text-[#00F0FF] hover:opacity-80 disabled:opacity-40"
                    >
                      {downloading === a.id ? 'Downloading…' : 'Receipt'}
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

// ─── Consultant Wallet ────────────────────────────────────────────────────────

function ConsultantWallet({ uid }: { uid: string }) {
  const [walletCents, setWalletCents] = useState(0);
  const [transactions, setTx]         = useState<(WalletTransaction & { id: string })[]>([]);
  const [topupAmount, setTopupAmount] = useState('');
  const [loadingTx, setLoadingTx]     = useState(true);
  const [topping, setTopping]         = useState(false);
  const [err, setErr]                 = useState('');

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) { setLoadingTx(false); return; }
      const [userSnap, txSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('__name__', '==', uid))),
        getDocs(query(collection(db, 'wallet_transactions'), where('consultant_id', '==', uid))),
      ]);
      if (!userSnap.empty) setWalletCents(userSnap.docs[0].data().ki_wallet_cents ?? 0);
      setTx(txSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<WalletTransaction, 'id'>) }))
        .sort((a, b) => b.created_at - a.created_at));
      setLoadingTx(false);
    })();
  }, [uid]);

  const handleTopup = async () => {
    const cents = Math.round(parseFloat(topupAmount) * 100);
    if (!cents || cents < 1000) { setErr('Minimum top-up is $10.'); return; }
    setErr(''); setTopping(true);
    try {
      const res  = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cents: cents, consultant_id: uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Top-up failed.');
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setTopping(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Ki Wallet</h1>

      {/* Balance card */}
      <div className="mb-6 rounded-2xl border border-[#B000FF]/20 bg-[#B000FF]/5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-white/50">Available Balance</p>
            <p className="mt-1 text-4xl font-bold text-white">${(walletCents / 100).toFixed(2)}</p>
            <p className="mt-1 text-xs text-white/30">Used to cover the 10% platform fee per booking.</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="10"
                step="5"
                placeholder="Amount ($)"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="w-28 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#B000FF]/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTopup}
                disabled={topping}
                className="rounded-xl bg-[#B000FF]/20 border border-[#B000FF]/30 px-4 py-2 text-sm font-semibold text-[#B000FF] transition hover:bg-[#B000FF]/30 disabled:opacity-50"
              >
                {topping ? 'Redirecting…' : 'Top Up'}
              </button>
            </div>
            {err && <p className="text-xs text-red-400">{err}</p>}
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="font-semibold text-white">Transaction History</h2>
        </div>
        {loadingTx ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/40">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{TX_TYPE_LABELS[tx.type] ?? tx.type}</p>
                  <p className="text-xs text-white/30">{new Date(tx.created_at).toLocaleDateString('en-US')}</p>
                  {tx.note && <p className="text-xs text-white/30">{tx.note}</p>}
                </div>
                <p className={`font-semibold ${TX_COLOR[tx.type] ?? 'text-white'}`}>
                  {TX_SIGN[tx.type] ?? ''}{(tx.amount_cents / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Management Wallet (supervisor / admin) ───────────────────────────────────

interface ConsultantRow {
  uid: string;
  displayName?: string;
  email: string;
  ki_wallet_cents: number;
}

function ManagementWallet() {
  const [consultants, setConsultants] = useState<ConsultantRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState<string | null>(null);
  const [editValue, setEditValue]     = useState('');
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState('');

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'consultant')));
      setConsultants(snap.docs.map((d) => ({
        uid:             d.id,
        displayName:     d.data().displayName,
        email:           d.data().email ?? '',
        ki_wallet_cents: d.data().ki_wallet_cents ?? 0,
      })));
      setLoading(false);
    })();
  }, []);

  const startEdit = (uid: string, cents: number) => {
    setEditing(uid);
    setEditValue((cents / 100).toFixed(2));
  };

  const saveEdit = async (uid: string) => {
    const cents = Math.round(parseFloat(editValue) * 100);
    if (isNaN(cents)) return;
    setSaving(true);
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore unavailable');
      await updateDoc(doc(db, 'users', uid), { ki_wallet_cents: cents, updatedAt: Date.now() });
      setConsultants((prev) => prev.map((c) => c.uid === uid ? { ...c, ki_wallet_cents: cents } : c));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const filtered = consultants.filter(
    (c) => !search || c.email.includes(search) || (c.displayName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Ki Wallet — All Consultants</h1>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#00F0FF]/50 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-16 text-center">
          <p className="text-white/40">No consultants found.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Consultant</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Ki Wallet Balance</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((c) => (
                <tr key={c.uid} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">{c.displayName ?? '—'}</td>
                  <td className="px-4 py-3 text-white/60">{c.email}</td>
                  <td className="px-4 py-3">
                    {editing === c.uid ? (
                      <div className="flex items-center gap-2">
                        <span className="text-white/30">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 rounded-lg border border-[#B000FF]/30 bg-white/5 px-2 py-1 text-sm text-white focus:outline-none"
                          autoFocus
                        />
                        <button type="button" onClick={() => saveEdit(c.uid)} disabled={saving}
                          className="rounded-lg bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50">
                          {saving ? '…' : 'Save'}
                        </button>
                        <button type="button" onClick={() => setEditing(null)}
                          className="text-xs text-white/30 hover:text-white">Cancel</button>
                      </div>
                    ) : (
                      <span className={`font-semibold ${c.ki_wallet_cents < 1000 ? 'text-red-400' : 'text-emerald-400'}`}>
                        ${(c.ki_wallet_cents / 100).toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editing !== c.uid && (
                      <button type="button" onClick={() => startEdit(c.uid, c.ki_wallet_cents)}
                        className="text-xs text-[#B000FF] hover:opacity-80">Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-white/25">
        Balances with less than $10 are highlighted in red — consultant may not have enough to cover platform fees on new bookings.
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const { user } = useUserRole();
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  const isManagement = user?.role === 'admin' || user?.role === 'supervisor';
  const isConsultant = user?.role === 'consultant';

  if (!uid) return null;

  if (isManagement)       return <ManagementWallet />;
  if (isConsultant)       return <ConsultantWallet uid={uid} />;
  return <ClientWallet />;
}
