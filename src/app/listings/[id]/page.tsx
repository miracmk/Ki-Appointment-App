'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { getCategoryLabel } from '@/lib/categories';
import type { ConsultantListing, MarketplaceCategory, ListingCurrency } from '@/types/marketplace';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';

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
  accounting_tax:       'border-ki-primary/30 bg-ki-primary/10 text-ki-primary',
  law_corporate:        'border-ki-accent/30 bg-ki-accent/10 text-ki-accent',
  immigration_visa:     'border-ki-secondary/30 bg-ki-secondary/10 text-ki-accent',
  financial_investment: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
  customs_trade:        'border-orange-500/25 bg-orange-500/10 text-orange-500',
  trademark_ip:         'border-ki-muted/30 bg-ki-muted/10 text-ki-accent',
};

const DURATION_OPTIONS = [
  { minutes: 30,  label: '30 min'  },
  { minutes: 60,  label: '1 hour'  },
  { minutes: 90,  label: '1.5 h'   },
  { minutes: 120, label: '2 hours' },
  { minutes: 180, label: '3 hours' },
  { minutes: 240, label: '4 hours' },
];

function fmtDuration(m: number) {
  if (m < 60)   return `${m}m`;
  if (m === 60) return '1h';
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export default function ListingDetailPage() {
  const params    = useParams();
  const router    = useRouter();
  const listingId = params.id as string;

  const [listing,    setListing]    = useState<ConsultantListing | null>(null);
  const [consultant, setConsultant] = useState<Record<string, unknown> | null>(null);
  const [loading,    setLoading]    = useState(true);

  // Duration / intro selection
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [useIntro,         setUseIntro]         = useState(false);

  // Ki Wallet balance
  const [walletMinutes, setWalletMinutes] = useState<number | null>(null);

  // "Request saved" toast
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    fetch(`/api/marketplace/listings/${listingId}`)
      .then(r => r.json())
      .then(d => {
        setListing(d.listing ?? null);
        setConsultant(d.consultant ?? null);
        if (d.listing?.pricing?.type === 'hourly') {
          setSelectedDuration(60);
          setUseIntro(true); // default to intro for first visit
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [listingId]);

  // Ki Wallet
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

  const handleSchedule = () => {
    setShowToast(true);
    setTimeout(() => {
      const intro    = useIntro && listing?.pricing.type === 'hourly';
      const duration = intro ? (listing?.intro_duration_minutes ?? 15) : selectedDuration;
      router.push(`/book/${listingId}?duration=${duration}${intro ? '&intro=1' : ''}`);
    }, 900);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ki-primary border-t-transparent" />
    </div>
  );

  if (!listing) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
      <p className="text-[var(--text-muted)]">Listing not found.</p>
    </div>
  );

  const sym            = CURRENCY_SYMBOLS[listing.pricing.currency] ?? '$';
  const isHourly       = listing.pricing.type === 'hourly';
  const introPriceCts  = listing.intro_price_cents ?? 10000;
  const introDurMin    = listing.intro_duration_minutes ?? 15;
  const colorClass     = CATEGORY_COLORS[listing.category] ?? 'border-white/15 text-white/50 bg-white/5';
  const consultantName = (consultant?.displayName ?? consultant?.name ?? 'C') as string;

  // Price to show for the current selection
  const activePriceCents = useIntro && isHourly
    ? introPriceCts
    : isHourly
      ? Math.round(listing.pricing.amount_cents * selectedDuration / 60)
      : listing.pricing.amount_cents;

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Navbar />
      {/* Toast */}
      {showToast && (
        <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4 pointer-events-none">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-[var(--glass-bg)] px-5 py-3.5 shadow-glow-ki backdrop-blur-md">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Request saved — redirecting to scheduling…
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Link href="/marketplace" className="transition hover:text-ki-primary">Marketplace</Link>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/marketplace/${listing.category}`} className="transition hover:text-ki-primary">
            {getCategoryLabel(listing.category as MarketplaceCategory)}
          </Link>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="line-clamp-1 text-[var(--text-secondary)]">{listing.title}</span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Left: listing details */}
          <div className="space-y-6 lg:col-span-2">

            {/* Header */}
            <div className="glass-card p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
                  {getCategoryLabel(listing.category as MarketplaceCategory)}
                </span>
                <span className="rounded-lg border px-2.5 py-1 text-xs text-[var(--text-muted)]"
                  style={{ borderColor: 'var(--glass-border)', background: 'transparent' }}>
                  {listing.specialty_label}
                </span>
                {(consultant?.kyc_status as string) === 'verified' && (
                  <span className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    KYC Verified
                  </span>
                )}
                {listing.requires_contract && (
                  <span className="rounded-lg border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-500">
                    📄 Contract required
                  </span>
                )}
              </div>

              <h1 className="mb-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{listing.title}</h1>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[var(--text-primary)]">
                  {sym}{(listing.pricing.amount_cents / 100).toLocaleString()}
                </span>
                <span className="text-[var(--text-muted)]">{PRICING_LABELS[listing.pricing.type]}</span>
              </div>
              {listing.pricing.hours_included && (
                <p className="mt-1 text-sm text-[var(--text-muted)]">{listing.pricing.hours_included} hours included</p>
              )}
              {listing.pricing.sessions_included && (
                <p className="mt-1 text-sm text-[var(--text-muted)]">{listing.pricing.sessions_included} sessions</p>
              )}
              {listing.pricing.custom_note && (
                <p className="mt-2 text-sm italic text-[var(--text-muted)]">{listing.pricing.custom_note}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.pricing.payment_methods.map(m => (
                  <span key={m} className="rounded-lg border px-3 py-1 text-xs text-[var(--text-muted)]"
                    style={{ borderColor: 'var(--glass-border)' }}>
                    {m === 'card' ? '💳 Card (Stripe)' : '🏦 Bank Transfer'}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="glass-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">About this service</h2>
              <p className="whitespace-pre-line leading-relaxed text-[var(--text-secondary)]">{listing.description}</p>
            </div>

            {/* Reference cases */}
            {listing.references?.length > 0 && (
              <div className="glass-card p-6">
                <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                  Reference Cases
                  <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">({listing.references.length})</span>
                </h2>
                <div className="space-y-4">
                  {listing.references.map((ref, i) => (
                    <div key={i} className="rounded-xl border p-4" style={{ borderColor: 'var(--glass-border)', background: 'var(--glass-bg)' }}>
                      <h3 className="font-medium text-[var(--text-primary)]">{ref.title}</h3>
                      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{ref.description}</p>
                      {ref.outcome && (
                        <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-500">
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
              <div className="glass-card p-6">
                <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">About the Consultant</h2>
                <div className="flex items-start gap-4">
                  {consultant.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={consultant.photo_url as string} alt={consultantName}
                      className="h-14 w-14 rounded-2xl object-cover ring-2 ring-ki-primary/20" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ki-gradient text-xl font-bold text-white">
                      {consultantName[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/profile/${listing.consultant_id}`}
                        className="font-semibold text-[var(--text-primary)] hover:text-ki-primary transition">
                        {consultantName}
                      </Link>
                      {!!consultant.is_ki_business && (
                        <span className="rounded-lg border border-ki-primary/30 bg-ki-primary/10 px-2 py-0.5 text-xs font-semibold text-ki-primary">
                          Ki Business
                        </span>
                      )}
                    </div>
                    {!!consultant.title && <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{String(consultant.title)}</p>}
                    {!!consultant.location && <p className="mt-1 text-xs text-[var(--text-muted)]">📍 {String(consultant.location)}</p>}
                    {((consultant.rating as number) ?? 0) > 0 && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{((consultant.rating as number) ?? 0).toFixed(1)}</span>
                        <span className="text-sm text-[var(--text-muted)]">({(consultant.review_count as number) ?? 0} reviews)</span>
                      </div>
                    )}
                    {((consultant.languages as string[]) ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {((consultant.languages as string[]) ?? []).map(l => (
                          <span key={l} className="rounded-md border px-2 py-0.5 text-xs text-[var(--text-muted)]"
                            style={{ borderColor: 'var(--glass-border)' }}>{l}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {!!consultant.bio && (
                  <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">{String(consultant.bio)}</p>
                )}
              </div>
            )}
          </div>

          {/* Right: scheduling panel */}
          <div className="lg:col-span-1">
            <div className="glass-card sticky top-24 p-6">
              <h2 className="mb-5 text-lg font-semibold text-[var(--text-primary)]">Schedule a Session</h2>

              {/* Ki Wallet balance */}
              {walletMinutes !== null && (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-ki-primary/20 bg-ki-primary/5 px-4 py-3">
                  <svg className="h-5 w-5 shrink-0 text-ki-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)]">Ki Wallet balance with this consultant</p>
                    <p className="text-sm font-semibold text-ki-primary">
                      {walletMinutes >= 60
                        ? `${Math.floor(walletMinutes / 60)}h ${walletMinutes % 60 ? walletMinutes % 60 + 'm' : ''}`
                        : `${walletMinutes} min`}
                      {' '}remaining
                    </p>
                  </div>
                </div>
              )}

              {/* Session options */}
              <div className="mb-5 space-y-2">
                <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
                  {isHourly ? 'How long do you need?' : 'Session'}
                </p>

                {/* Intro option (hourly only) */}
                {isHourly && (
                  <button
                    type="button"
                    onClick={() => setUseIntro(true)}
                    className={[
                      'w-full rounded-xl border p-3.5 text-left transition',
                      useIntro
                        ? 'border-ki-primary/40 bg-ki-primary/10'
                        : 'hover:border-ki-primary/30',
                    ].join(' ')}
                    style={!useIntro ? { borderColor: 'var(--glass-border)' } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-semibold ${useIntro ? 'text-ki-primary' : 'text-[var(--text-primary)]'}`}>
                          ⭐ Intro Meeting
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {fmtDuration(introDurMin)} · First consultation
                        </p>
                      </div>
                      <p className={`text-lg font-bold ${useIntro ? 'text-ki-primary' : 'text-[var(--text-primary)]'}`}>
                        {sym}{(introPriceCts / 100).toLocaleString()}
                      </p>
                    </div>
                  </button>
                )}

                {/* Regular duration options (hourly) */}
                {isHourly && (
                  <div className="grid grid-cols-3 gap-2">
                    {DURATION_OPTIONS.map(opt => (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => { setUseIntro(false); setSelectedDuration(opt.minutes); }}
                        className={[
                          'rounded-xl border py-2.5 text-xs font-medium transition',
                          !useIntro && selectedDuration === opt.minutes
                            ? 'border-ki-primary/40 bg-ki-primary/10 text-ki-primary'
                            : 'text-[var(--text-muted)] hover:text-ki-primary hover:border-ki-primary/30',
                        ].join(' ')}
                        style={!(!useIntro && selectedDuration === opt.minutes) ? { borderColor: 'var(--glass-border)' } : {}}
                      >
                        <p>{opt.label}</p>
                        <p className="mt-0.5 opacity-70">
                          {sym}{(Math.round(listing.pricing.amount_cents * opt.minutes / 60) / 100).toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Non-hourly: single option */}
                {!isHourly && (
                  <div className="rounded-xl border border-ki-primary/20 bg-ki-primary/5 p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{listing.title}</p>
                      <p className="text-lg font-bold text-[var(--text-primary)]">
                        {sym}{(listing.pricing.amount_cents / 100).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{PRICING_LABELS[listing.pricing.type]}</p>
                  </div>
                )}
              </div>

              {/* Price summary */}
              <div className="mb-5 rounded-xl border p-4" style={{ borderColor: 'var(--glass-border)', background: 'var(--glass-bg)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--text-muted)]">Session total</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {sym}{(activePriceCents / 100).toLocaleString()}
                  </p>
                </div>
                <p className="mt-0.5 text-right text-xs text-[var(--text-muted)]">
                  {useIntro && isHourly
                    ? `Intro · ${fmtDuration(introDurMin)}`
                    : isHourly ? fmtDuration(selectedDuration)
                    : PRICING_LABELS[listing.pricing.type]}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSchedule}
                disabled={showToast}
                className="w-full rounded-xl bg-ki-gradient py-3.5 text-sm font-semibold text-white shadow-lg shadow-ki-primary/20 transition hover:opacity-90 disabled:opacity-70"
              >
                {showToast ? '✓ Request saved…' : 'Schedule Consultation →'}
              </button>

              <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
                You will select a date & time on the next page
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
