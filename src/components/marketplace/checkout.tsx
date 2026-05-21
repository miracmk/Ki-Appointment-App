'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { POPULAR_TIMEZONES } from '@/lib/timezone';

interface MarketplaceCheckoutProps {
  consultantId: string;
  packageId?: string;
  specialtyId?: string;
  categoryId?: string;
  listingAmountCents?: number;
  listingTitle?: string;
}

const PACKAGES = [
  { id: 'starter',   label: '30 Minutes', price: '$200',   description: 'Quick consultation' },
  { id: 'growth',    label: '60 Minutes', price: '$1,000', description: 'Comprehensive session' },
  { id: 'scale',     label: '3 Hours',    price: '$5,000', description: 'In-depth analysis' },
  { id: 'executive', label: 'Full Day',   price: '$10,000', description: 'Strategy & implementation' },
];

export function MarketplaceCheckout({ consultantId, packageId, specialtyId, categoryId, listingAmountCents, listingTitle }: MarketplaceCheckoutProps) {
  const [selectedPackage, setSelectedPackage] = useState(packageId ?? 'starter');
  const [email,      setEmail]      = useState('');
  const [name,       setName]       = useState('');
  const [date,       setDate]       = useState('');
  const [time,       setTime]       = useState('');
  const [timezone,   setTimezone]   = useState('Europe/Istanbul');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email || !date || !time) throw new Error('Please fill in all required fields.');

      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId,
          packageId: selectedPackage,
          customerEmail: email,
          customerName: name,
          appointmentDate: date,
          appointmentTime: time,
          appointmentTimezone: timezone,
          specialtyId: specialtyId ?? '',
          categoryId: categoryId ?? '',
          listingAmountCents: listingAmountCents,
          listingTitle: listingTitle,
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
        const cfg = await cfgRes.json();
        key = cfg.publishableKey;
      }
      if (!key) throw new Error('Stripe is not configured. Please contact an admin.');

      const stripe = await loadStripe(key);
      if (!stripe) throw new Error('Could not load Stripe.');

      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if ((result as any)?.error) throw new Error((result as any).error.message ?? 'Redirect failed.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleCheckout} className="space-y-6">
      {/* Package selector */}
      <div>
        <label className="mb-3 block text-sm font-medium text-white/70">Select Package</label>
        <div className="grid grid-cols-2 gap-2">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => setSelectedPackage(pkg.id)}
              className={`rounded-xl border p-3 text-left transition ${
                selectedPackage === pkg.id
                  ? 'border-[#00F0FF]/50 bg-[#00F0FF]/10 text-white'
                  : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
              }`}
            >
              <div className="text-sm font-semibold">{pkg.label}</div>
              <div className="mt-0.5 text-xs text-white/40">{pkg.description}</div>
              <div className={`mt-1 text-sm font-bold ${selectedPackage === pkg.id ? 'text-[#00F0FF]' : 'text-white/50'}`}>
                {pkg.price}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Full Name"
            className="input-dark w-full"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">
            Email <span className="text-[#FF006E]">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="input-dark w-full"
          />
        </div>
        <div>
          <label htmlFor="appt-date" className="mb-1.5 block text-sm font-medium text-white/70">
            Date <span className="text-[#FF006E]">*</span>
          </label>
          <input
            id="appt-date"
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            required
            className="input-dark w-full"
          />
        </div>
        <div>
          <label htmlFor="appt-time" className="mb-1.5 block text-sm font-medium text-white/70">
            Time <span className="text-[#FF006E]">*</span>
          </label>
          <input
            id="appt-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="input-dark w-full"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-white/70">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="input-dark w-full !bg-[#161820]"
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
        className="w-full rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] py-3.5 text-base font-semibold text-white shadow-[0_0_30px_rgba(0,71,255,0.3)] transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : (
          'Proceed to Payment'
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-white/30">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Secured by Stripe
      </p>
    </form>
  );
}
