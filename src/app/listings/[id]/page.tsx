'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getFirestoreClient } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import { POPULAR_TIMEZONES } from '@/lib/timezone';
import { getCategoryLabel } from '@/lib/categories';
import type { ConsultantListing, MarketplaceCategory, ListingCurrency } from '@/types/marketplace';
import Link from 'next/link';

const DURATION_OPTIONS = [
  { minutes: 30,  label: '30 minutes' },
  { minutes: 60,  label: '1 hour'     },
  { minutes: 90,  label: '1.5 hours'  },
  { minutes: 120, label: '2 hours'    },
  { minutes: 180, label: '3 hours'    },
  { minutes: 240, label: '4 hours'    },
];

const CURRENCY_SYMBOLS: Record<ListingCurrency, string> = {
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

const CATEGORY_COLORS: Record<string, string> = {
  accounting_tax:       'border-[#00F0FF]/25 bg-[#00F0FF]/10 text-[#00F0FF]',
  law_corporate:        'border-[#B000FF]/25 bg-[#B000FF]/10 text-[#B000FF]',
  immigration_visa:     'border-[#0047FF]/25 bg-[#0047FF]/10 text-blue-400',
  financial_investment: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  customs_trade:        'border-orange-500/25 bg-orange-500/10 text-orange-400',
  trademark_ip:         'border-[#FF006E]/25 bg-[#FF006E]/10 text-[#FF006E]',
};

function formatMinutes(m: number) {
  if (m < 60)   return `${m}m`;
  if (m === 60) return '1h';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export default function ListingDetailPage() {
  const params    = useParams();
  const listingId = params.id as string;

  const [listing,    setListing]    = useState<ConsultantListing | null>(null);
  const [consultant, setConsultant] = useState<Record<string, unknown> | null>(null);
  const [loading,    setLoading]    = useState(true);

  const [selectedDate,     setSelectedDate]     = useState('');
  const [selectedSlot,     setSelectedSlot]     = useState('');
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [slots,            setSlots]            = useState<{ time: string; available: boolean }[]>([]);
  const [slotsLoading,     setSlotsLoading]     = useState(false);
  const [email,            setEmail]            = useState('');
  const [name,             setName]             = useState('');
  const [timezone,         setTimezone]         = useState('Europe/Istanbul');
  const [submitting,       setSubmitting]       = useState(false);
  const [error,            setError]            = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }

      const snap = await getDoc(doc(db, 'consultant_listings', listingId));
      if (!snap.exists()) { setLoading(false); return; }

      const listingData = { id: snap.id, ...snap.data() } as ConsultantListing;
      setListing(listingData);

      if (listingData.pricing.type === 'hourly') {
        setSelectedDuration(60);
      } else if (listingData.pricing.hours_included) {
        setSelectedDuration(listingData.pricing.hours_included * 60);
      }

      const cSnap = await getDoc(doc(db, 'users', listingData.consultant_id));
      if (cSnap.exists()) setConsultant({ uid: cSnap.id, ...cSnap.data() });

      setLoading(false);
    })();
  }, [listingId]);

  useEffect(() => {
    if (!selectedDate || !listing) return;
    setSlotsLoading(true);
    setSelectedSlot('');
    fetch(`/api/availability/${listing.consultant_id}?date=${selectedDate}&duration=${selectedDuration}`)
      .then(r => r.json())
      .then(d => { setSlots(d.slots ?? []); setSlotsLoading(false); })
      .catch(() => setSlotsLoading(false));
  }, [selectedDate, selectedDuration, listing]);

  const handleBook = async () => {
    if (!listing || !email) return;
    setSubmitting(true);
    setError(null);

    try {
      const isHourly         = listing.pricing.type === 'hourly';
      const priceForDuration = isHourly
        ? Math.round(listing.pricing.amount_cents * selectedDuration / 60)
        : listing.pricing.amount_cents;

      const res = await fetch('/api/checkout/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId:        listing.consultant_id,
          listingId,
          listingTitle:        listing.title,
          listingAmountCents:  priceForDuration,
          durationMinutes:     selectedDuration,
          customerEmail:       email,
          customerName:        name,
          appointmentDate:     selectedDate,
          appointmentTime:     selectedSlot,
          appointmentTimezone: timezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not create checkout session.');

      let key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!key) {
        const cfgRes = await fetch('/api/stripe/config');
        const cfg    = await cfgRes.json();
        key = cfg.publishableKey;
      }
      if (!key) throw new Error('Stripe is not configured.');

      const stripe = await loadStripe(key);
      if (!stripe) throw new Error('Could not load Stripe.');
      await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0B0F]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
    </div>
  );

  if (!listing) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0B0F]">
      <p className="text-white/50">Listing not found.</p>
    </div>
  );

  const sym              = CURRENCY_SYMBOLS[listing.pricing.currency] ?? '$';
  const isHourly         = listing.pricing.type === 'hourly';
  const priceForDuration = isHourly
    ? Math.round(listing.pricing.amount_cents * selectedDuration / 60)
    : listing.pricing.amount_cents;
  const colorClass       = CATEGORY_COLORS[listing.category] ?? 'border-white/15 text-white/50 bg-white/5';
  const consultantName   = (consultant?.displayName ?? consultant?.name ?? 'C') as string;
  const today            = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      {/* Nav */}
      <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0A0B0F]/80 px-6 py-4 backdrop-blur-md">
        <Link href="/marketplace" className="text-sm text-white/40 hover:text-white">← Marketplace</Link>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm text-white/40">
          <Link href="/marketplace" className="transition hover:text-white">Marketplace</Link>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/marketplace/${listing.category}`} className="transition hover:text-white">
            {getCategoryLabel(listing.category as MarketplaceCategory)}
          </Link>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="line-clamp-1 text-white/70">{listing.title}</span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Left: listing details */}
          <div className="space-y-6 lg:col-span-2">

            {/* Header */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
                  {getCategoryLabel(listing.category as MarketplaceCategory)}
                </span>
                <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
                  {listing.specialty_label}
                </span>
                {(consultant?.kyc_status as string) === 'verified' && (
                  <span className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    KYC Verified
                  </span>
                )}
                {listing.requires_contract && (
                  <span className="rounded-lg border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400">
                    📄 Contract required
                  </span>
                )}
              </div>

              <h1 className="mb-3 text-2xl font-bold text-white sm:text-3xl">{listing.title}</h1>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">
                  {sym}{(listing.pricing.amount_cents / 100).toLocaleString()}
                </span>
                <span className="text-white/40">{PRICING_LABELS[listing.pricing.type]}</span>
              </div>
              {listing.pricing.hours_included && (
                <p className="mt-1 text-sm text-white/35">{listing.pricing.hours_included} hours included</p>
              )}
              {listing.pricing.sessions_included && (
                <p className="mt-1 text-sm text-white/35">{listing.pricing.sessions_included} sessions</p>
              )}
              {listing.pricing.custom_note && (
                <p className="mt-2 text-sm italic text-white/30">{listing.pricing.custom_note}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.pricing.payment_methods.map(m => (
                  <span key={m} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/40">
                    {m === 'card' ? '💳 Card (Stripe)' : '🏦 Bank Transfer'}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-semibold text-white">About this service</h2>
              <p className="whitespace-pre-line leading-relaxed text-white/60">{listing.description}</p>
            </div>

            {/* Reference cases */}
            {listing.references?.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
                <h2 className="mb-4 text-lg font-semibold text-white">
                  Reference Cases
                  <span className="ml-2 text-sm font-normal text-white/30">({listing.references.length})</span>
                </h2>
                <div className="space-y-4">
                  {listing.references.map((ref, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <h3 className="font-medium text-white">{ref.title}</h3>
                      <p className="mt-1.5 text-sm text-white/50">{ref.description}</p>
                      {ref.outcome && (
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-400/80">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {ref.outcome}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consultant card */}
            {consultant && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
                <h2 className="mb-4 text-lg font-semibold text-white">About the Consultant</h2>
                <div className="flex items-start gap-4">
                  {consultant.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={consultant.photo_url as string}
                      alt={consultantName}
                      className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white/10"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0047FF] to-[#00F0FF] text-xl font-bold text-white">
                      {consultantName[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{consultantName}</h3>
                      {!!consultant.is_ki_business && (
                        <span className="rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2 py-0.5 text-xs font-semibold text-[#00F0FF]">
                          Ki Business
                        </span>
                      )}
                    </div>
                    {!!consultant.title && <p className="mt-0.5 text-sm text-white/50">{String(consultant.title)}</p>}
                    {!!consultant.location && (
                      <p className="mt-1 text-xs text-white/35">📍 {String(consultant.location)}</p>
                    )}
                    {((consultant.rating as number) ?? 0) > 0 && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm font-medium text-white">{((consultant.rating as number) ?? 0).toFixed(1)}</span>
                        <span className="text-sm text-white/35">({(consultant.review_count as number) ?? 0} reviews)</span>
                      </div>
                    )}
                    {((consultant.languages as string[]) ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {((consultant.languages as string[]) ?? []).map(l => (
                          <span key={l} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs text-white/40">{l}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {!!consultant.bio && (
                  <p className="mt-4 text-sm leading-relaxed text-white/50">{String(consultant.bio)}</p>
                )}
              </div>
            )}
          </div>

          {/* Right: booking panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
              <h2 className="mb-5 text-lg font-semibold text-white">Book this Service</h2>

              {isHourly && (
                <div className="mb-5">
                  <p className="mb-2 text-xs font-medium text-white/50">Session Duration</p>
                  <div className="grid grid-cols-3 gap-2">
                    {DURATION_OPTIONS.map(opt => (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => setSelectedDuration(opt.minutes)}
                        className={`rounded-xl border py-2 text-xs font-medium transition ${
                          selectedDuration === opt.minutes
                            ? 'border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF]'
                            : 'border-white/10 bg-white/5 text-white/40 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs text-white/40">Service Price</p>
                <p className="text-2xl font-bold text-white">
                  {sym}{(priceForDuration / 100).toLocaleString()}
                  {isHourly && (
                    <span className="ml-1 text-sm font-normal text-white/40">
                      for {formatMinutes(selectedDuration)}
                    </span>
                  )}
                </p>
              </div>

              <div className="mb-4">
                <label htmlFor="booking-date" className="mb-1.5 block text-xs font-medium text-white/50">
                  Select Date <span className="text-red-400">*</span>
                </label>
                <input
                  id="booking-date"
                  type="date"
                  min={today}
                  value={selectedDate}
                  onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(''); }}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:border-[#00F0FF]/60 focus:outline-none"
                />
              </div>

              {selectedDate && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-white/50">Available Time Slots</p>
                  {slotsLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-3 text-center text-xs text-white/30">
                      No available slots on this date
                    </p>
                  ) : (
                    <div className="grid max-h-48 grid-cols-3 gap-1.5 overflow-y-auto pr-1">
                      {slots.map(slot => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`rounded-lg border py-1.5 text-xs font-medium transition ${
                            !slot.available
                              ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-white/20 line-through'
                              : selectedSlot === slot.time
                              ? 'border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF]'
                              : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedSlot && (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/50">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#00F0FF]/60 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/50">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#00F0FF]/60 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="booking-timezone" className="mb-1.5 block text-xs font-medium text-white/50">Timezone</label>
                    <select
                      id="booking-timezone"
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:border-[#00F0FF]/60 focus:outline-none"
                    >
                      {POPULAR_TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleBook}
                disabled={submitting || !selectedSlot || !email}
                className="w-full rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(0,71,255,0.3)] transition hover:opacity-90 disabled:opacity-40"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : !selectedDate ? 'Select a date to continue'
                  : !selectedSlot ? 'Select a time slot'
                  : !email        ? 'Enter your email'
                  : `Proceed to Payment — ${sym}${(priceForDuration / 100).toLocaleString()}`}
              </button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/30">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secured by Stripe
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
