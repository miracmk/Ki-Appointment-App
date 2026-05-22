'use client';

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

// Ki teal palette — each category gets its own tint
const CATEGORY_COLORS: Record<string, string> = {
  accounting_tax:       'border-ki-primary/30 bg-ki-primary/10 text-ki-primary',
  law_corporate:        'border-ki-accent/30 bg-ki-accent/10 text-ki-accent',
  immigration_visa:     'border-ki-secondary/30 bg-ki-secondary/10 text-ki-accent',
  financial_investment: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
  customs_trade:        'border-orange-500/25 bg-orange-500/10 text-orange-500',
  trademark_ip:         'border-ki-muted/30 bg-ki-muted/10 text-ki-accent',
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

function StarRating({ rating, count }: { rating: number; count?: number }) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: full }).map((_, i) => (
          <svg key={`f${i}`} className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        {half && (
          <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <defs><clipPath id="hc"><rect width="10" height="20"/></clipPath></defs>
            <path clipPath="url(#hc)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <svg key={`e${i}`} className="h-3.5 w-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1}>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs font-medium text-[var(--text-secondary)]">{rating.toFixed(1)}</span>
      {count != null && count > 0 && (
        <span className="text-xs text-[var(--text-muted)]">({count})</span>
      )}
    </div>
  );
}

export function ListingCard({ listing }: { listing: PublicListing }) {
  const sym        = CURRENCY_SYMBOLS[listing.pricing.currency] ?? '$';
  const amt        = listing.pricing.amount_cents / 100;
  const suffix     = PRICING_LABELS[listing.pricing.type] ?? '';
  const colorClass = CATEGORY_COLORS[listing.category] ?? 'border-ki-primary/20 text-ki-primary bg-ki-primary/5';
  const isVerified = listing.kyc_status === 'verified';

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      {/* Top badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
          {getCategoryLabel(listing.category)}
        </span>
        <span
          className="rounded-lg border px-2.5 py-1 text-xs text-[var(--text-muted)]"
          style={{ borderColor: 'var(--glass-border)', background: 'transparent' }}
        >
          {listing.specialty_label}
        </span>
        {isVerified && (
          <span className="ml-auto flex items-center gap-1 text-xs text-emerald-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Verified
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mb-2 font-semibold text-[var(--text-primary)] transition-colors group-hover:text-ki-primary line-clamp-2">
        {listing.title}
      </h3>

      {/* Description */}
      <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        {listing.description}
      </p>

      {/* References indicator */}
      {listing.references?.length > 0 && (
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          📁 {listing.references.length} reference case{listing.references.length !== 1 ? 's' : ''}
        </p>
      )}

      <div className="mt-auto space-y-3">
        {/* Consultant row */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/profile/${listing.consultant_id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-0.5 transition hover:bg-ki-primary/10"
          >
            {listing.photo_url ? (
              <img
                src={listing.photo_url}
                alt={listing.consultant_name ?? ''}
                className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-ki-primary/20"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ki-gradient text-xs font-bold text-white">
                {(listing.consultant_name ?? 'C').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate text-xs font-medium text-[var(--text-secondary)] group-hover:text-ki-primary">
              {listing.consultant_name}
            </span>
          </Link>

          {(listing.rating ?? 0) > 0 && (
            <StarRating rating={listing.rating!} count={listing.review_count} />
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xl font-bold text-[var(--text-primary)]">
              {sym}{amt.toLocaleString()}
            </span>
            <span className="text-sm text-[var(--text-muted)]">{suffix}</span>
          </div>
          <span className="shrink-0 rounded-xl bg-ki-gradient px-4 py-1.5 text-sm font-semibold text-white transition group-hover:opacity-90">
            Book Now
          </span>
        </div>

        {/* KYC / contract notice */}
        {(listing.requires_kyc || listing.requires_contract) && (
          <div className="flex flex-wrap gap-1.5">
            {listing.requires_kyc      && <span className="text-[10px] text-amber-500">🔒 KYC required</span>}
            {listing.requires_contract && <span className="text-[10px] text-orange-500">📄 Contract required</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
