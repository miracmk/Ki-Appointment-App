'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import type { WalletTransaction } from '@/types/marketplace';

const TOPUP_AMOUNTS = [1000, 2500, 5000, 10000, 25000]; // cents

export default function ConsultantPaymentsPage() {
  const [uid, setUid]           = useState<string | null>(null);
  const [wallet, setWallet]     = useState(0);
  const [mode, setMode]         = useState<string>('own_keys');
  const [txns, setTxns]         = useState<(WalletTransaction & { id: string })[]>([]);
  const [loading, setLoading]   = useState(true);
  const [topupAmt, setTopupAmt] = useState(1000);
  const [toppingUp, setToppingUp] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      setUid(user.uid);
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const [profileDoc, txSnap] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDocs(query(collection(db, 'wallet_transactions'), where('consultant_id', '==', user.uid), orderBy('created_at', 'desc'))),
      ]);
      if (profileDoc.exists()) {
        setWallet(profileDoc.data().ki_wallet_cents ?? 0);
        setMode(profileDoc.data().payment_mode ?? 'own_keys');
      }
      setTxns(txSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WalletTransaction, 'id'>) })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleTopup = async () => {
    if (!uid) return;
    setToppingUp(true);
    setError(null);
    try {
      const res  = await fetch('/api/wallet/topup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultant_id: uid, amount_cents: topupAmt }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Top-up could not be initiated.');
      const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!key) throw new Error('Payment not configured.');
      const stripe = await loadStripe(key);
      if (!stripe) throw new Error('Payment could not be loaded.');
      await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
      setToppingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B000FF] border-t-transparent" />
      </div>
    );
  }

  const TXN_LABELS: Record<string, string> = {
    topup_stripe: 'Top-up (Card)', topup_bank: 'Top-up (Bank)',
    deduction_platform_fee: 'Platform Fee', refund: 'Refund',
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Payments</h1>

      {/* Wallet balance */}
      <div className="rounded-2xl border border-[#00F0FF]/20 bg-[#00F0FF]/5 p-6">
        <p className="text-sm text-white/50">Ki Wallet Balance</p>
        <p className="mt-1 text-4xl font-bold text-[#00F0FF]">${(wallet / 100).toFixed(2)}</p>
        <p className="mt-1 text-xs text-white/30">
          Payment mode: <span className="text-white/60">{mode === 'own_keys' ? 'Own Stripe (Mode B)' : mode === 'ki_escrow' ? 'Ki Escrow (Mode A)' : mode === 'ki_connect' ? 'Stripe Connect (Mode C)' : mode}</span>
        </p>
      </div>

      {/* Top-up (Mode B only) */}
      {mode === 'own_keys' && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
          <h2 className="font-semibold text-white">Add Funds</h2>
          <p className="text-sm text-white/40">A 10% platform fee is deducted from your wallet per appointment. Ensure sufficient balance before going live.</p>
          <div className="flex flex-wrap gap-2">
            {TOPUP_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setTopupAmt(amt)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  topupAmt === amt
                    ? 'border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF]'
                    : 'border-white/10 bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                ${(amt / 100).toFixed(0)}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="button"
            onClick={handleTopup}
            disabled={toppingUp}
            className="rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {toppingUp ? 'Redirecting…' : `Add $${(topupAmt / 100).toFixed(0)}`}
          </button>
        </div>
      )}

      {/* Transaction history */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="font-semibold text-white">Transaction History</h2>
        </div>
        {txns.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/30">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {txns.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-white">{TXN_LABELS[tx.type] ?? tx.type}</p>
                  <p className="text-xs text-white/30">{new Date(tx.created_at).toLocaleString('en-US')}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.amount_cents >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.amount_cents >= 0 ? '+' : ''}${(tx.amount_cents / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
