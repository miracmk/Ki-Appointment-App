'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const STEPS = [
  { label: 'Submitted',   key: 'submitted' },
  { label: 'Under Review', key: 'pending' },
  { label: 'Verified',    key: 'verified' },
];

export default function ClientKycPage() {
  const [status, setStatus]   = useState<string>('none');
  const [reason, setReason]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const d = await getDoc(doc(db, 'kyc_submissions', user.uid));
      if (d.exists()) {
        setStatus(d.data().status ?? 'none');
        setReason(d.data().rejection_reason ?? null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const stepIndex = status === 'verified' ? 2 : status === 'pending' ? 1 : status === 'submitted' ? 0 : -1;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">KYC Verification</h1>
      <p className="mb-8 text-white/50">Track your identity verification status here.</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status card */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <div className="mb-6 flex items-center gap-4">
              {status === 'verified' ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                  <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : status === 'rejected' ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                  <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#00F0FF]/20 bg-[#00F0FF]/10">
                  <svg className="h-7 w-7 text-[#00F0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {status === 'verified' ? 'KYC Verified' :
                   status === 'rejected' ? 'KYC Rejected' :
                   status === 'pending'  ? 'Review in Progress' :
                   'KYC Not Submitted'}
                </h2>
                <p className="text-sm text-white/40">
                  {status === 'verified' ? 'Your identity has been successfully verified.' :
                   status === 'rejected' ? 'Your application was rejected.' :
                   status === 'pending'  ? 'Your documents are under review, this may take 1-3 business days.' :
                   'No identity verification application has been submitted yet.'}
                </p>
                {reason && <p className="mt-1 text-sm text-red-400">Rejection reason: {reason}</p>}
              </div>
            </div>

            {/* Progress stepper */}
            {status !== 'none' && status !== 'rejected' && (
              <div className="flex items-center gap-2">
                {STEPS.map((step, i) => (
                  <div key={step.key} className="flex flex-1 items-center gap-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                      i <= stepIndex
                        ? 'border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF]'
                        : 'border-white/10 bg-white/5 text-white/30'
                    }`}>
                      {i < stepIndex ? '✓' : i + 1}
                    </div>
                    <span className={`hidden text-xs sm:block ${i <= stepIndex ? 'text-white/70' : 'text-white/25'}`}>
                      {step.label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div className={`h-px flex-1 ${i < stepIndex ? 'bg-[#00F0FF]/30' : 'bg-white/10'}`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <h3 className="mb-3 font-semibold text-white">About KYC</h3>
            <p className="text-sm leading-relaxed text-white/50">
              Identity verification (KYC) on the Ki Business platform is required for a secure consulting experience.
              KYC may be mandatory for high-value services. Document upload and verification is handled securely via Stripe Identity.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
