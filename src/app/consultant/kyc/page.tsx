'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';

export default function ConsultantKycPage() {
  const [uid, setUid]         = useState<string | null>(null);
  const [kyc, setKyc]         = useState<{ status: string; fee_paid: boolean; rejection_reason?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      setUid(user.uid);
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const d = await getDoc(doc(db, 'users', user.uid));
      if (d.exists()) {
        setKyc({
          status:   d.data().kyc_status ?? 'none',
          fee_paid: d.data().kyc_fee_paid ?? false,
          rejection_reason: d.data().kyc_rejection_reason,
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handlePayFee = async () => {
    if (!uid) return;
    setPaying(true);
    setError(null);
    try {
      const res  = await fetch('/api/consultant/kyc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultant_id: uid }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Ödeme başlatılamadı.');

      const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!key) throw new Error('Stripe yapılandırılmamış.');
      const stripe = await loadStripe(key);
      if (!stripe) throw new Error('Stripe yüklenemedi.');
      await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Hata oluştu.');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B000FF] border-t-transparent" />
      </div>
    );
  }

  const status   = kyc?.status ?? 'none';
  const feePaid  = kyc?.fee_paid ?? false;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">KYC Doğrulama</h1>

      {/* Status */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
            status === 'verified' ? 'border border-emerald-500/30 bg-emerald-500/10' :
            status === 'rejected' ? 'border border-red-500/30 bg-red-500/10' :
            'border border-[#B000FF]/20 bg-[#B000FF]/10'
          }`}>
            {status === 'verified' ? (
              <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-7 w-7 text-[#B000FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-white">
              {status === 'verified' ? 'Doğrulandı ✓' :
               status === 'rejected' ? 'Reddedildi' :
               status === 'pending'  ? 'İnceleniyor…' :
               'Doğrulama Gerekiyor'}
            </h2>
            <p className="text-sm text-white/40">
              {status === 'verified' ? 'Kimliğiniz başarıyla doğrulanmıştır.' :
               status === 'rejected' ? `Red sebebi: ${kyc?.rejection_reason ?? 'Belirtilmedi'}` :
               status === 'pending'  ? 'Belgeleriniz inceleniyor, 1-3 iş günü sürebilir.' :
               'Marketplace\'te görünmek için KYC doğrulamanızı tamamlayın.'}
            </p>
          </div>
        </div>
      </div>

      {/* Steps */}
      {status !== 'verified' && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-5">
          <h3 className="font-semibold text-white">Doğrulama Adımları</h3>

          {/* Step 1: $5 fee */}
          <div className={`flex items-start gap-4 rounded-xl border p-4 ${feePaid ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${feePaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50'}`}>
              {feePaid ? '✓' : '1'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">KYC Ücreti — $5</p>
              <p className="mt-0.5 text-sm text-white/40">Tek seferlik kimlik doğrulama işlem ücreti.</p>
              {!feePaid && (
                <button
                  type="button"
                  onClick={handlePayFee}
                  disabled={paying}
                  className="mt-3 rounded-xl bg-gradient-to-r from-[#B000FF] to-[#0047FF] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {paying ? 'Yönlendirilıyor…' : '$5 Öde'}
                </button>
              )}
            </div>
          </div>

          {/* Step 2: Review */}
          <div className={`flex items-start gap-4 rounded-xl border p-4 ${status === 'pending' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/50'}`}>
              2
            </div>
            <div>
              <p className="font-medium text-white">İnceleme</p>
              <p className="mt-0.5 text-sm text-white/40">Ödeme sonrası başvurunuz otomatik olarak incelemeye alınır.</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
