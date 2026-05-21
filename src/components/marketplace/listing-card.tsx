import Link from 'next/link';
import type { ConsultantListing, ListingCurrency } from '@/types/marketplace';
import { getCategoryLabel } from '@/lib/categories';

const CURRENCY_SYMBOLS: Record<ListingCurrency, string> = {
  usd: '$', eur: '€', gbp: '£', try: '₺',
};

const PRICING_LABELS: Record<string, string> = {
  hourly:           '/ hr',
  per_session:      '/ session',
  monthly_retainer: '/ month',
  yearly_retainer:  '/ year',
  project_based:    ' total',
  package:          ' package',
};

const CATEGORY_COLORS: Record<string, string> = {
  accounting_tax:       'border-[#00F0FF]/25 bg-[#00F0FF]/10 text-[#00F0FF]',
  law_corporate:        'border-[#B000FF]/25 bg-[#B000FF]/10 text-[#B000FF]',
  immigration_visa:     'border-[#0047FF]/25 bg-[#0047FF]/10 text-blue-400',
  financial_investment: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  customs_trade:        'border-orange-500/25 bg-orange-500/10 text-orange-400',
  trademark_ip:         'border-[#FF006E]/25 bg-[#FF006E]/10 text-[#FF006E]',
};

export interface PublicListing extends ConsultantListing {
  photo_url?: string;
  rating?: number;
  review_count?: number;
  kyc_status?: string;
  languages?: string[];
  title_consultant?: string;
  location?: string;
}

export function ListingCard({ listing }: { listing: PublicListing }) {
  const sym        = CURRENCY_SYMBOLS[listing.pricing.currency] ?? '$';
  const amt        = listing.pricing.amount_cents / 100;
  const suffix     = PRICING_LABELS[listing.pricing.type] ?? '';
  const colorClass = CATEGORY_COLORS[listing.category] ?? 'border-white/15 text-white/50 bg-white/5';
  const isVerified = listing.kyc_status === 'verified';

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm transition duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:-translate-y-0.5"
    >
      {/* Top badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
          {getCategoryLabel(listing.category)}
        </span>
        <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
          {listing.specialty_label}
        </span>
        {isVerified && (
          <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Verified
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mb-2 font-semibold text-white group-hover:text-[#00F0FF] transition-colors line-clamp-2">
        {listing.title}
      </h3>

      {/* Description */}
      <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-white/45">
        {listing.description}
      </p>

      {/* References indicator */}
      {listing.references?.length > 0 && (
        <p className="mb-3 text-xs text-white/30">
          📁 {listing.references.length} reference case{listing.references.length !== 1 ? 's' : ''}
        </p>
      )}

      <div className="mt-auto space-y-3">
        {/* Consultant + rating row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {listing.photo_url ? (
              <img
                src={listing.photo_url}
                alt={listing.consultant_name ?? ''}
                className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0047FF] to-[#00F0FF] text-xs font-bold text-white">
                {(listing.consultant_name ?? 'C').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate text-xs text-white/50">{listing.consultant_name}</span>
          </div>
          {(listing.rating ?? 0) > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-medium text-white">{(listing.rating ?? 0).toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xl font-bold text-white">
              {sym}{amt.toLocaleString()}
            </span>
            <span className="text-sm text-white/40">{suffix}</span>
          </div>
          <span className="shrink-0 rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-4 py-1.5 text-sm font-semibold text-white transition group-hover:opacity-90">
            Book Now
          </span>
        </div>

        {/* KYC / contract notice */}
        {(listing.requires_kyc || listing.requires_contract) && (
          <div className="flex flex-wrap gap-1.5">
            {listing.requires_kyc && (
              <span className="text-[10px] text-amber-400/70">🔒 KYC required</span>
            )}
            {listing.requires_contract && (
              <span className="text-[10px] text-orange-400/70">📄 Contract required</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
