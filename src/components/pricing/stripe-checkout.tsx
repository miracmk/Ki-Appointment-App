'use client';

import { useEffect, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { PublicConsultantInfo } from '@/types/marketplace';

interface CheckoutButtonProps {
  packageId: string;
  packageName: string;
  packagePriceCents: number;
}

// Mirror of server-side pricingMap — used only for client-side fee preview
const PACKAGE_PRICES: Record<string, number> = {
  starter:   20000,
  growth:   100000,
  scale:    500000,
  executive: 1000000,
};

function calcFees(consultingCents: number, isKiBusiness: boolean) {
  if (isKiBusiness) {
    return { consulting: consultingCents, platform: 0, stripe: 0, total: consultingCents };
  }
  const platform = Math.ceil(consultingCents * 0.10);
  const stripe   = Math.ceil((consultingCents + platform) * 0.029) + 30;
  return { consulting: consultingCents, platform, stripe, total: consultingCents + platform + stripe };
}

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const INPUT_CLS = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#00F0FF]/50 focus:outline-none transition';
const LABEL_CLS = 'mb-1.5 block text-xs font-medium text-white/50';

export function CheckoutButton({ packageId, packageName, packagePriceCents }: CheckoutButtonProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [consultants,  setConsultants]  = useState<PublicConsultantInfo[]>([]);
  const [loadingC,     setLoadingC]     = useState(false);
  const [selectedId,   setSelectedId]   = useState('');
  const [email,        setEmail]        = useState('');
  const [name,         setName]         = useState('');
  const [apptDate,     setApptDate]     = useState('');
  const [apptTime,     setApptTime]     = useState('');
  const [timezone,     setTimezone]     = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [formOpen, setFormOpen] = useState(false);

  const priceCents    = PACKAGE_PRICES[packageId] ?? packagePriceCents ?? 0;
  const selectedC     = consultants.find((c) => c.uid === selectedId);
  const isKiBusiness  = selectedC?.is_ki_business ?? false;
  const fees          = calcFees(priceCents, isKiBusiness);

  useEffect(() => {
    const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (envKey) {
      setStripePromise(loadStripe(envKey));
    } else {
      fetch('/api/stripe/config')
        .then((r) => r.json())
        .then((cfg) => { if (cfg.publishableKey) setStripePromise(loadStripe(cfg.publishableKey)); })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!formOpen) return;
    setLoadingC(true);
    fetch('/api/consultants')
      .then((r) => r.json())
      .then((data) => {
        const list: PublicConsultantInfo[] = data.consultants || [];
        setConsultants(list);
        if (list.length === 1) setSelectedId(list[0].uid);
      })
      .catch(() => setConsultants([]))
      .finally(() => setLoadingC(false));
  }, [formOpen]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !apptDate || !apptTime || !selectedId) {
      setError('Please select a consultant and fill in your email, date, and time.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId: selectedId, packageId,
          customerEmail: email, customerName: name,
          appointmentDate: apptDate, appointmentTime: apptTime,
          appointmentTimezone: timezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create checkout session.');
      if (!data.sessionId) throw new Error('No session ID returned.');
      if (!stripePromise) throw new Error('Stripe is not configured.');

      const stripe = await stripePromise;
      if (!stripe) throw new Error('Could not load Stripe.');

      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (result.error) throw new Error(result.error.message || 'Stripe redirect failed.');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!formOpen) {
    return (
      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className="mt-8 w-full rounded-xl bg-[#00F0FF]/10 py-3 text-sm font-semibold text-[#00F0FF] transition hover:bg-[#00F0FF]/20 border border-[#00F0FF]/20"
      >
        Book {packageName} Package
      </button>
    );
  }

  return (
    <form
      onSubmit={handleCheckout}
      className="mt-6 space-y-5 rounded-2xl border border-white/[0.08] bg-[#0D0E14]/90 p-6 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white">Appointment Details</h4>
        <button type="button" onClick={() => setFormOpen(false)} className="text-white/30 hover:text-white">✕</button>
      </div>

      {/* Consultant selector */}
      <div>
        <p className={LABEL_CLS}>Select Consultant</p>
        {loadingC ? (
          <div className="flex items-center gap-2 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
            <span className="text-sm text-white/40">Loading consultants…</span>
          </div>
        ) : consultants.length === 0 ? (
          <p className="text-sm text-red-400">No consultants available for booking.</p>
        ) : (
          <div className="space-y-2">
            {consultants.map((c) => (
              <button
                key={c.uid}
                type="button"
                onClick={() => setSelectedId(c.uid)}
                className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  selectedId === c.uid
                    ? 'border-[#00F0FF]/40 bg-[#00F0FF]/5'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                }`}
              >
                {c.photo_url ? (
                  <img src={c.photo_url} alt={c.name} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#00F0FF]/10 text-xs font-bold text-[#00F0FF]">
                    {c.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{c.name}</p>
                  {c.title && <p className="truncate text-xs text-white/40">{c.title}</p>}
                </div>
                {selectedId === c.uid && <span className="text-[#00F0FF] text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLS}>Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>Full Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Full Name" className={INPUT_CLS} />
        </div>
      </div>

      {/* Date / time / timezone */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`date-${packageId}`} className={LABEL_CLS}>Date *</label>
          <input
            id={`date-${packageId}`} type="date" value={apptDate}
            onChange={(e) => setApptDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]} required
            className={INPUT_CLS + ' [color-scheme:dark]'}
          />
        </div>
        <div>
          <label htmlFor={`time-${packageId}`} className={LABEL_CLS}>Time *</label>
          <input
            id={`time-${packageId}`} type="time" value={apptTime}
            onChange={(e) => setApptTime(e.target.value)} required
            className={INPUT_CLS + ' [color-scheme:dark]'}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`tz-${packageId}`} className={LABEL_CLS}>Timezone</label>
        <select
          id={`tz-${packageId}`} value={timezone} onChange={(e) => setTimezone(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#0D0E14] px-4 py-2.5 text-sm text-white focus:border-[#00F0FF]/50 focus:outline-none"
        >
          <option value="Europe/Istanbul">Istanbul (TRT)</option>
          <option value="America/New_York">New York (ET)</option>
          <option value="America/Chicago">Chicago (CT)</option>
          <option value="America/Denver">Denver (MT)</option>
          <option value="America/Los_Angeles">Los Angeles (PT)</option>
          <option value="Europe/London">London (GMT)</option>
          <option value="Europe/Paris">Paris (CET)</option>
          <option value="Asia/Dubai">Dubai (GST)</option>
          <option value="Asia/Tokyo">Tokyo (JST)</option>
          <option value="Australia/Sydney">Sydney (AEST)</option>
          <option value="UTC">UTC</option>
        </select>
      </div>

      {/* ── Fee Breakdown ─────────────────────────────────────────── */}
      {selectedId && priceCents > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Order Summary</p>

          <div className="flex justify-between text-sm text-white/70">
            <span>Consulting Fee</span>
            <span>{fmt(fees.consulting)}</span>
          </div>

          {isKiBusiness ? (
            /* Condition A — Ki Business direct: no extra fees */
            <p className="text-xs text-white/30 italic">No service fee — Ki Business direct service</p>
          ) : (
            /* Condition B — standard consultant: show full breakdown */
            <>
              <div className="flex justify-between text-sm text-white/50">
                <span>Platform Fee <span className="text-xs text-white/30">(10%)</span></span>
                <span>{fmt(fees.platform)}</span>
              </div>
              <div className="flex justify-between text-sm text-white/50">
                <span>Processing Fee <span className="text-xs text-white/30">(2.9% + $0.30)</span></span>
                <span>{fmt(fees.stripe)}</span>
              </div>
            </>
          )}

          <div className="border-t border-white/[0.08] pt-2 flex justify-between font-semibold text-white">
            <span>Total</span>
            <span className="text-[#00F0FF]">{fmt(fees.total)}</span>
          </div>
        </div>
      )}

      {error && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !selectedId || consultants.length === 0}
        className="w-full rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 py-3 text-sm font-semibold text-[#00F0FF] transition hover:bg-[#00F0FF]/20 disabled:opacity-40"
      >
        {loading
          ? 'Processing…'
          : selectedC
          ? `Pay ${fmt(fees.total)} — Book with ${selectedC.name}`
          : `Pay for ${packageName} Package`}
      </button>
      <p className="text-center text-xs text-white/25">Secured by Stripe · All payments are encrypted</p>
    </form>
  );
}
