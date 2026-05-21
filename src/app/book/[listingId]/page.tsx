'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { POPULAR_TIMEZONES } from '@/lib/timezone';
import { getCategoryLabel } from '@/lib/categories';
import type { ConsultantListing, ListingCurrency, MarketplaceCategory, WeeklyAvailability } from '@/types/marketplace';
import Link from 'next/link';

const SYM: Record<ListingCurrency, string> = { usd: '$', eur: '€', gbp: '£', try: '₺' };

const DAY_KEYS: (keyof WeeklyAvailability)[] = [
  'sunday','monday','tuesday','wednesday','thursday','friday','saturday',
];
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function fmtDuration(m: number) {
  if (m < 60)   return `${m}m`;
  if (m === 60) return '1 hour';
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

// ─── Mini calendar ───────────────────────────────────────────────────────────

function MonthCalendar({
  year, month, selectedDate, availability, onDateSelect, onPrev, onNext,
}: {
  year: number;
  month: number;
  selectedDate: string;
  availability: WeeklyAvailability | null;
  onDateSelect: (d: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const today   = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay  = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysCount; d++) cells.push(d);
  // pad to complete row
  while (cells.length % 7) cells.push(null);

  function isDayAvailable(dayNum: number): boolean {
    if (!availability) return true; // no config → assume open
    const date = new Date(year, month, dayNum);
    const key  = DAY_KEYS[date.getDay()];
    return availability[key]?.enabled === true;
  }

  function isPast(dayNum: number): boolean {
    return new Date(year, month, dayNum) < today;
  }

  const canPrev = !(year === today.getFullYear() && month === today.getMonth());

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-white">{MONTHS[month]} {year}</p>
        <button
          onClick={onNext}
          className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DAY_SHORT.map((d) => (
          <div key={d} className="py-1 text-[11px] font-medium text-white/30">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {cells.map((dayNum, i) => {
          if (!dayNum) return <div key={i} />;
          const dateStr  = `${year}-${String(month + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
          const past     = isPast(dayNum);
          const avail    = isDayAvailable(dayNum);
          const selected = dateStr === selectedDate;

          return (
            <button
              key={i}
              disabled={past || !avail}
              onClick={() => onDateSelect(dateStr)}
              className={[
                'rounded-xl py-2 text-sm font-medium transition',
                selected
                  ? 'bg-[#00F0FF] text-[#0A0B0F] shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : past || !avail
                  ? 'text-white/15 cursor-not-allowed'
                  : 'text-white hover:bg-white/10 cursor-pointer',
              ].join(' ')}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs text-white/30">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#00F0FF]/60" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-white/10" /> Unavailable
        </span>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function BookPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const listingId    = params.listingId as string;
  const urlDuration  = Number(searchParams.get('duration') ?? 60);
  const isIntro      = searchParams.get('intro') === '1';

  const [listing,    setListing]    = useState<ConsultantListing | null>(null);
  const [consultant, setConsultant] = useState<Record<string, unknown> | null>(null);
  const [loading,    setLoading]    = useState(true);

  // Calendar state
  const now = new Date();
  const [calYear,   setCalYear]   = useState(now.getFullYear());
  const [calMonth,  setCalMonth]  = useState(now.getMonth());
  const [selDate,   setSelDate]   = useState('');
  const [slots,     setSlots]     = useState<{ time: string; available: boolean }[]>([]);
  const [slotsLoad, setSlotsLoad] = useState(false);
  const [selSlot,   setSelSlot]   = useState('');

  // Booking form
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [timezone,  setTimezone]  = useState('Europe/Istanbul');
  const [submitting,setSubmitting]= useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Ki Wallet balance
  const [walletMinutes, setWalletMinutes] = useState<number | null>(null);

  // Load listing
  useEffect(() => {
    fetch(`/api/marketplace/listings/${listingId}`)
      .then(r => r.json())
      .then(d => {
        setListing(d.listing ?? null);
        setConsultant(d.consultant ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [listingId]);

  // Load Ki Wallet balance
  useEffect(() => {
    if (!listing) return;
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const res  = await fetch(`/api/time-credits?clientUid=${user.uid}&consultantId=${listing.consultant_id}`);
        const data = await res.json();
        const remaining = (data.credits as Array<{remaining_minutes: number; status: string}> ?? [])
          .filter(c => c.status === 'available')
          .reduce((s, c) => s + c.remaining_minutes, 0);
        setWalletMinutes(remaining);
      } catch { /* ignore */ }
    });
    return () => unsub();
  }, [listing]);

  // Load slots when date selected
  const fetchSlots = useCallback(async (date: string, duration: number, consultantId: string) => {
    setSlotsLoad(true);
    setSelSlot('');
    try {
      const res  = await fetch(`/api/availability/${consultantId}?date=${date}&duration=${duration}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch { setSlots([]); }
    setSlotsLoad(false);
  }, []);

  useEffect(() => {
    if (!selDate || !listing) return;
    fetchSlots(selDate, urlDuration, listing.consultant_id);
  }, [selDate, urlDuration, listing, fetchSlots]);

  // Derived price
  const sym          = listing ? (SYM[listing.pricing.currency] ?? '$') : '$';
  const introPriceCents = listing?.intro_price_cents ?? 10000;
  const priceCents   = isIntro
    ? introPriceCents
    : listing?.pricing.type === 'hourly'
      ? Math.round((listing.pricing.amount_cents * urlDuration) / 60)
      : listing?.pricing.amount_cents ?? 0;

  const handlePrevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const handlePay = async () => {
    if (!listing || !selDate || !selSlot || !email) return;
    setSubmitting(true);
    setError(null);
    try {
      const res  = await fetch('/api/checkout/session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId:        listing.consultant_id,
          listingId,
          listingTitle:        listing.title,
          listingAmountCents:  priceCents,
          durationMinutes:     urlDuration,
          customerEmail:       email,
          customerName:        name,
          appointmentDate:     selDate,
          appointmentTime:     selSlot,
          appointmentTimezone: timezone,
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
        key = (await cfgRes.json()).publishableKey;
      }
      if (!key) throw new Error('Stripe not configured.');
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

  const consultantName = (consultant?.name ?? consultant?.displayName ?? '') as string;
  const availability   = (consultant?.availability ?? null) as WeeklyAvailability | null;

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      {/* Nav */}
      <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0A0B0F]/80 px-6 py-4 backdrop-blur-md">
        <Link href={`/listings/${listingId}`} className="text-sm text-white/40 hover:text-white">
          ← Back to listing
        </Link>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
              {getCategoryLabel(listing.category as MarketplaceCategory)}
            </span>
            {isIntro && (
              <span className="rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2.5 py-1 text-xs font-semibold text-[#00F0FF]">
                Intro Session
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{listing.title}</h1>
          {consultantName && (
            <p className="mt-1 text-sm text-white/40">with {consultantName}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">

          {/* Left: calendar + slots */}
          <div className="space-y-6 lg:col-span-3">

            <MonthCalendar
              year={calYear}
              month={calMonth}
              selectedDate={selDate}
              availability={availability}
              onDateSelect={setSelDate}
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
            />

            {/* Slots */}
            {selDate && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="mb-3 text-sm font-semibold text-white">
                  Available times on{' '}
                  <span className="text-[#00F0FF]">
                    {new Date(selDate + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric',
                    })}
                  </span>
                </p>
                {slotsLoad ? (
                  <div className="flex justify-center py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="py-3 text-center text-sm text-white/30">
                    No available slots on this date
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {slots.map(slot => (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => setSelSlot(slot.time)}
                        className={[
                          'rounded-xl border py-2 text-xs font-medium transition',
                          !slot.available
                            ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-white/20 line-through'
                            : selSlot === slot.time
                            ? 'border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF]'
                            : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white',
                        ].join(' ')}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: booking summary + form */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-4">

              {/* Price card */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="mb-1 text-xs text-white/40">Session price</p>
                <p className="text-3xl font-bold text-white">
                  {sym}{(priceCents / 100).toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-white/40">
                  {isIntro ? `Intro session · ${fmtDuration(listing.intro_duration_minutes ?? 15)}`
                           : fmtDuration(urlDuration)}
                </p>

                {/* Ki Wallet balance */}
                {walletMinutes !== null && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#00F0FF]/15 bg-[#00F0FF]/5 px-3 py-2">
                    <svg className="h-4 w-4 shrink-0 text-[#00F0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-[11px] text-white/40">Ki Wallet balance</p>
                      <p className="text-sm font-semibold text-[#00F0FF]">
                        {walletMinutes >= 60
                          ? `${Math.floor(walletMinutes / 60)}h ${walletMinutes % 60 ? walletMinutes % 60 + 'm' : ''}`
                          : `${walletMinutes} min`}
                        {' '}with this consultant
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Selection summary */}
              {selDate && selSlot && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-emerald-400">Selected slot</p>
                      <p className="mt-0.5 text-sm font-semibold text-white">
                        {new Date(selDate + 'T12:00:00').toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })} · {selSlot}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3">
                <p className="text-sm font-semibold text-white">Your details</p>

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
                  <label className="mb-1.5 block text-xs font-medium text-white/50">Timezone</label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#161820] px-4 py-2.5 text-sm text-white focus:border-[#00F0FF]/60 focus:outline-none"
                  >
                    {POPULAR_TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={submitting || !selDate || !selSlot || !email}
                className="w-full rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(0,71,255,0.3)] transition hover:opacity-90 disabled:opacity-40"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing…
                  </span>
                ) : !selDate ? 'Select a date'
                  : !selSlot ? 'Select a time slot'
                  : !email   ? 'Enter your email'
                  : `Confirm & Pay — ${sym}${(priceCents / 100).toLocaleString()}`}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-xs text-white/30">
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
