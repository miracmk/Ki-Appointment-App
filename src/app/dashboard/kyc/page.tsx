'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';

type KycStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

interface KycState {
  kycStatus: KycStatus;
  role: string;
  application: {
    firstName?: string;
    lastName?: string;
    status?: string;
    rejectionReason?: string;
    submittedAt?: number;
  } | null;
}

const STEPS = [
  { label: 'Submitted',    key: 'submitted' },
  { label: 'Under Review', key: 'pending' },
  { label: 'Verified',     key: 'approved' },
];

export default function ClientKycPage() {
  const searchParams  = useSearchParams();
  const applyIntent   = searchParams.get('apply'); // 'consultant'
  const [state, setState] = useState<KycState | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken]     = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({ firstName: '', lastName: '', nationalId: '', dateOfBirth: '', documentUrls: '' });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }

      const idToken = await user.getIdToken();
      setToken(idToken);

      try {
        const res = await fetch('/api/kyc/status', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setState(data);
          // Auto-open form if coming from consultant registration
          if (applyIntent === 'consultant' && data.kycStatus === 'unverified') {
            setShowForm(true);
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    });

    return () => unsub();
  }, [applyIntent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/kyc/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          documentUrls: form.documentUrls.split('\n').map((u) => u.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ ok: false, message: data.error || 'Submission failed.' });
      } else {
        setFeedback({ ok: true, message: 'KYC application submitted! An admin will review it within 1–3 business days.' });
        setState((prev) => prev ? { ...prev, kycStatus: 'pending' } : null);
        setShowForm(false);
      }
    } catch {
      setFeedback({ ok: false, message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const kycStatus = state?.kycStatus ?? 'unverified';
  const stepIndex = kycStatus === 'approved' ? 2 : kycStatus === 'pending' ? 1 : kycStatus === 'unverified' ? -1 : -1;
  const isVerified  = kycStatus === 'approved';
  const isRejected  = kycStatus === 'rejected';
  const isPending   = kycStatus === 'pending';
  const isConsultant = state?.role === 'consultant';

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">KYC Verification</h1>
      <p className="mb-8 text-white/50">
        {isConsultant
          ? 'Your identity is verified. You have full consultant access.'
          : 'Submit your identity documents to become a verified consultant on the platform.'}
      </p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status card */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <div className="mb-6 flex items-start gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border ${
                isVerified  ? 'border-emerald-500/30 bg-emerald-500/10' :
                isRejected  ? 'border-red-500/30 bg-red-500/10' :
                isPending   ? 'border-yellow-500/30 bg-yellow-500/10' :
                'border-[#00F0FF]/20 bg-[#00F0FF]/10'
              }`}>
                {isVerified ? (
                  <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isRejected ? (
                  <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-7 w-7 text-[#00F0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {isVerified  ? 'KYC Verified — Consultant'  :
                   isRejected  ? 'KYC Application Rejected'   :
                   isPending   ? 'Review in Progress'          :
                   'KYC Not Submitted'}
                </h2>
                <p className="text-sm text-white/40">
                  {isVerified  ? 'Your identity has been verified. You are an active consultant.' :
                   isRejected  ? 'Your application was rejected. You may resubmit with corrected information.' :
                   isPending   ? 'Your documents are being reviewed — this may take 1–3 business days.' :
                   'Submit your identity information to apply for a consultant account.'}
                </p>
                {isRejected && state?.application?.rejectionReason && (
                  <p className="mt-1 text-sm text-red-400">
                    Reason: {state.application.rejectionReason}
                  </p>
                )}
              </div>
            </div>

            {/* Progress stepper */}
            {(isPending || isVerified) && (
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

            {/* CTA to open form */}
            {(kycStatus === 'unverified' || isRejected) && !showForm && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-4 rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
              >
                {isRejected ? 'Resubmit KYC Application' : 'Apply for Consultant Account'}
              </button>
            )}
          </div>

          {/* Application form */}
          {showForm && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <h3 className="mb-1 text-lg font-semibold text-white">Consultant KYC Application</h3>
              <p className="mb-5 text-sm text-white/40">
                All fields are required. Your information is stored securely and only reviewed by administrators.
              </p>

              {feedback && (
                <div className={`mb-4 rounded-xl border p-3 text-sm ${
                  feedback.ok
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}>
                  {feedback.message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { id: 'firstName', label: 'First Name', placeholder: 'Jane' },
                    { id: 'lastName',  label: 'Last Name',  placeholder: 'Smith' },
                  ].map(({ id, label, placeholder }) => (
                    <div key={id}>
                      <label htmlFor={id} className="block text-sm font-medium text-white/70">{label} *</label>
                      <input
                        id={id}
                        type="text"
                        required
                        placeholder={placeholder}
                        value={form[id as keyof typeof form]}
                        onChange={(e) => setForm((prev) => ({ ...prev, [id]: e.target.value }))}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-[#00F0FF]/50 focus:ring-2 focus:ring-[#00F0FF]/20"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nationalId" className="block text-sm font-medium text-white/70">National ID / Passport No. *</label>
                    <input
                      id="nationalId"
                      type="text"
                      required
                      placeholder="A1234567"
                      value={form.nationalId}
                      onChange={(e) => setForm((prev) => ({ ...prev, nationalId: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-[#00F0FF]/50 focus:ring-2 focus:ring-[#00F0FF]/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-white/70">Date of Birth *</label>
                    <input
                      id="dateOfBirth"
                      type="date"
                      required
                      value={form.dateOfBirth}
                      onChange={(e) => setForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#00F0FF]/50 focus:ring-2 focus:ring-[#00F0FF]/20"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="documentUrls" className="block text-sm font-medium text-white/70">
                    Document URLs <span className="text-white/30">(optional — one URL per line)</span>
                  </label>
                  <textarea
                    id="documentUrls"
                    rows={3}
                    placeholder="https://drive.example.com/id-front.jpg&#10;https://drive.example.com/id-back.jpg"
                    value={form.documentUrls}
                    onChange={(e) => setForm((prev) => ({ ...prev, documentUrls: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-[#00F0FF]/50 focus:ring-2 focus:ring-[#00F0FF]/20"
                  />
                  <p className="mt-1 text-xs text-white/30">Upload your documents to any cloud storage and paste the public URLs here.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-6 py-3 font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting…' : 'Submit KYC Application'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setFeedback(null); }}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50 transition hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Info box */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <h3 className="mb-3 font-semibold text-white">About KYC Verification</h3>
            <ul className="space-y-2 text-sm text-white/50">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[#00F0FF]">→</span>
                KYC is required for consultants to appear on the marketplace and receive bookings.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[#00F0FF]">→</span>
                Review typically takes 1–3 business days after submission.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[#00F0FF]">→</span>
                Provide accurate information. Rejected applications may be resubmitted with corrections.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
