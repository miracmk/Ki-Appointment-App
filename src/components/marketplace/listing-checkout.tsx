'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { POPULAR_TIMEZONES } from '@/lib/timezone';
import type { ListingPricing } from '@/types/marketplace';

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: '$', eur: '€', gbp: '£', try: '₺',
};

const PRICING_LABELS: Record<string, string> = {
  hourly:           'per hour',
  per_session:      'per session',
  monthly_retainer: 'per month',
  yearly_retainer:  'per year',
  project_based:    'total project',
  package:          'package',
};

interface ListingCheckoutProps {
  consultantId: string;
  listingId: string;
  listingTitle: string;
  pricing: ListingPricing;
  requiresKyc?: boolean;
  requiresContract?: boolean;
}

export function ListingCheckout({
  consultantId, listingId, listingTitle, pricing,
  requiresKyc, requiresContract,
}: ListingCheckoutProps) {
  const [email,    setEmail]    = useState('');
  const [name,     setName]     = useState('');
  const [date,     setDate]     = useState('');
  const [time,     setTime]     = useState('');
  const [timezone, setTimezone] = useState('Europe/Istanbul');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const sym    = CURRENCY_SYMBOLS[pricing.currency] ?? '$';
  const amount = pricing.amount_cents / 100;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!email || !date || !time) throw new Error('Please fill in all required fields.');

      const res = await fetch('/api/checkout/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          consultantId,
          customerEmail:       email,
          customerName:        name,
          appointmentDate:     date,
          appointmentTime:     time,
          appointmentTimezone: timezone,
          listingId,
          listingTitle,
          amountCents:         pricing.amount_cents,
          currency:            pricing.currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not create checkout session.');

      if (data.sessionUrl) {
        window.location.assign(data.sessionUrl);
        return;
      }

      let key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!key) {
        const cfgRes = await fetch('/api/stripe/config');
        const cfg    = await cfgRes.json();
        key = cfg.publishableKey;
      }
      if (!key) throw new Error('Stripe is not configured. Please contact support.');

      const stripe = await loadStripe(key);
      if (!stripe) throw new Error('Could not load Stripe.');

      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if ((result as any)?.error) throw new Error(result.error.message ?? 'Redirect failed.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleCheckout} className="space-y-5">
      {/* Price summary */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-white/40">Service Price</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-white">{sym}{amount.toLocaleString()}</span>
          <span className="text-sm text-white/40">{PRICING_LABELS[pricing.type]}</span>
        </div>
        {pricing.hours_included && (
          <p className="mt-1 text-xs text-white/35">{pricing.hours_included} hours included</p>
        )}
        {pricing.sessions_included && (
          <p className="mt-1 text-xs text-white/35">{pricing.sessions_included} sessions included</p>
        )}
        {pricing.custom_note && (
          <p className="mt-1.5 text-xs italic text-white/30">{pricing.custom_note}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pricing.payment_methods.map((m) => (
            <span key={m} className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
              {m === 'card' ? '💳 Card' : '🏦 Bank Transfer'}
            </span>
          ))}
        </div>
      </div>

      {/* KYC / Contract notices */}
      {requiresKyc && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-400/80">
          🔒 KYC verification will be required before the session is confirmed.
        </div>
      )}
      {requiresContract && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-2.5 text-xs text-orange-400/80">
          📄 A service contract will be required for this engagement.
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="input-dark w-full text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Email <span className="text-[#FF006E]">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="input-dark w-full text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Preferred Date <span className="text-[#FF006E]">*</span>
          </label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            required
            className="input-dark w-full text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            Preferred Time <span className="text-[#FF006E]">*</span>
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="input-dark w-full text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/50">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="input-dark w-full !bg-[#161820] text-sm"
        >
          {POPULAR_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(0,71,255,0.3)] transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing…
          </span>
        ) : (
          `Proceed to Payment — ${sym}${amount.toLocaleString()}`
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-white/25">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Secured by Stripe
      </p>
    </form>
  );
}
