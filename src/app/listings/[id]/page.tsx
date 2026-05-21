import { notFound } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ListingCheckout } from '@/components/marketplace/listing-checkout';
import { getCategoryLabel } from '@/lib/categories';
import type { ConsultantListing, ListingCurrency } from '@/types/marketplace';

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

interface Consultant {
  uid: string;
  name: string;
  photo_url?: string;
  title?: string;
  bio?: string;
  rating?: number;
  review_count?: number;
  kyc_status?: string;
  languages?: string[];
  location?: string;
  is_ki_business?: boolean;
}

async function getListing(id: string): Promise<{ listing: ConsultantListing; consultant: Consultant } | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res  = await fetch(`${base}/api/marketplace/listings/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getListing(id);

  if (!result) notFound();

  const { listing, consultant } = result;
  const sym     = CURRENCY_SYMBOLS[listing.pricing.currency] ?? '$';
  const amount  = listing.pricing.amount_cents / 100;
  const colorClass = CATEGORY_COLORS[listing.category] ?? 'border-white/15 text-white/50 bg-white/5';

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm text-white/40">
          <a href="/marketplace" className="transition hover:text-white">Marketplace</a>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <a href={`/marketplace/${listing.category}`} className="transition hover:text-white">
            {getCategoryLabel(listing.category)}
          </a>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="line-clamp-1 text-white/70">{listing.title}</span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* ── Left: listing details ─────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Header */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
                  {getCategoryLabel(listing.category)}
                </span>
                <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
                  {listing.specialty_label}
                </span>
                {consultant.kyc_status === 'verified' && (
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
                <span className="text-3xl font-bold text-white">{sym}{amount.toLocaleString()}</span>
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

              {/* Payment methods */}
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.pricing.payment_methods.map((m) => (
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
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-semibold text-white">About the Consultant</h2>
              <div className="flex items-start gap-4">
                {consultant.photo_url ? (
                  <img
                    src={consultant.photo_url}
                    alt={consultant.name}
                    className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0047FF] to-[#00F0FF] text-xl font-bold text-white">
                    {consultant.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{consultant.name}</h3>
                    {consultant.is_ki_business && (
                      <span className="rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2 py-0.5 text-xs font-semibold text-[#00F0FF]">
                        Ki Business
                      </span>
                    )}
                  </div>
                  {consultant.title && <p className="mt-0.5 text-sm text-white/50">{consultant.title}</p>}
                  {consultant.location && (
                    <p className="mt-1 text-xs text-white/35">📍 {consultant.location}</p>
                  )}
                  {(consultant.rating ?? 0) > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm font-medium text-white">{(consultant.rating ?? 0).toFixed(1)}</span>
                      <span className="text-sm text-white/35">({consultant.review_count ?? 0} reviews)</span>
                    </div>
                  )}
                  {(consultant.languages ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(consultant.languages ?? []).map((l) => (
                        <span key={l} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs text-white/40">{l}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {consultant.bio && (
                <p className="mt-4 text-sm leading-relaxed text-white/50">{consultant.bio}</p>
              )}
            </div>
          </div>

          {/* ── Right: sticky checkout ────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
              <h2 className="mb-5 text-lg font-semibold text-white">Book this Service</h2>
              <ListingCheckout
                consultantId={listing.consultant_id}
                listingId={listing.id}
                listingTitle={listing.title}
                pricing={listing.pricing}
                requiresKyc={listing.requires_kyc}
                requiresContract={listing.requires_contract}
              />
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
