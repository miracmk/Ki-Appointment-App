'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { getCategoryLabel } from '@/lib/categories';
import type { MarketplaceCategory, ListingCurrency } from '@/types/marketplace';

const CURRENCY_SYMBOLS: Record<ListingCurrency, string> = {
  usd: '$', eur: '€', gbp: '£', try: '₺',
};

const ROLE_LABELS: Record<string, string> = {
  consultant: 'Consultant',
  client:     'Client',
  admin:      'Admin',
  supervisor: 'Supervisor',
};

function StarRating({ rating, count, size = 'sm' }: { rating: number; count?: number; size?: 'sm' | 'md' }) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const cls   = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  const starPath = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: full }).map((_, i) => (
          <svg key={`f${i}`} className={`${cls} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20"><path d={starPath} /></svg>
        ))}
        {half && (
          <svg className={`${cls} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
            <defs><clipPath id="hc2"><rect width="10" height="20"/></clipPath></defs>
            <path clipPath="url(#hc2)" d={starPath} />
          </svg>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <svg key={`e${i}`} className={`${cls} text-[var(--text-muted)]`} fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1}><path d={starPath} /></svg>
        ))}
      </div>
      <span className={`font-medium text-[var(--text-primary)] ${size === 'md' ? 'text-base' : 'text-sm'}`}>{rating.toFixed(1)}</span>
      {count != null && count > 0 && (
        <span className="text-sm text-[var(--text-muted)]">({count} review{count !== 1 ? 's' : ''})</span>
      )}
    </div>
  );
}

interface Profile {
  uid: string;
  name: string;
  email: string;
  photo_url: string;
  role: string;
  bio: string;
  title: string;
  location: string;
  languages: string[];
  categories: MarketplaceCategory[];
  rating: number;
  review_count: number;
  kyc_status: string;
  is_ki_business: boolean;
  created_at: number;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  pricing: { amount_cents: number; currency: ListingCurrency; type: string };
  rating: number;
  review_count: number;
}

interface Review {
  id: string;
  client_name: string;
  client_photo: string;
  rating: number;
  comment: string;
  created_at: number;
}

export default function ProfilePage() {
  const params = useParams();
  const uid    = params.uid as string;

  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews,  setReviews]  = useState<Review[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch(`/api/profile/${uid}`)
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile ?? null);
        setListings(d.listings ?? []);
        setReviews(d.reviews ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [uid]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ki-primary border-t-transparent" />
    </div>
  );

  if (!profile) return (
    <div className="flex min-h-screen flex-col bg-[var(--surface)]">
      <Navbar />
      <div className="flex flex-1 items-center justify-center">
        <p className="text-[var(--text-muted)]">Profile not found.</p>
      </div>
    </div>
  );

  const isConsultant = profile.role === 'consultant';
  const isVerified   = profile.kyc_status === 'verified';

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Navbar />

      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-ki-primary/10 blur-[120px]" />
        <div className="absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-ki-secondary/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">

        {/* ── Profile header ── */}
        <div className="glass-card mb-8 p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            {profile.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photo_url}
                alt={profile.name}
                className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-4 ring-ki-primary/20 sm:h-28 sm:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-ki-gradient text-3xl font-bold text-white sm:h-28 sm:w-28">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{profile.name}</h1>
                {isVerified && (
                  <span className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    KYC Verified
                  </span>
                )}
                {profile.is_ki_business && (
                  <span className="rounded-lg border border-ki-primary/30 bg-ki-primary/10 px-2.5 py-1 text-xs font-semibold text-ki-primary">
                    Ki Business
                  </span>
                )}
                <span className="rounded-lg border border-[var(--glass-border)] px-2.5 py-1 text-xs text-[var(--text-muted)]">
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </span>
              </div>

              {profile.title && (
                <p className="text-[var(--text-secondary)] text-base mb-2">{profile.title}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)] mb-3">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {profile.location}
                  </span>
                )}
                {profile.languages.length > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    {profile.languages.join(', ')}
                  </span>
                )}
                <span>Member since {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
              </div>

              {isConsultant && profile.rating > 0 && (
                <StarRating rating={profile.rating} count={profile.review_count} size="md" />
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-6 border-t pt-6" style={{ borderColor: 'var(--glass-border)' }}>
              <p className="leading-relaxed text-[var(--text-secondary)]">{profile.bio}</p>
            </div>
          )}

          {/* Categories */}
          {profile.categories.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {profile.categories.map(cat => (
                <span key={cat} className="rounded-lg border border-ki-primary/25 bg-ki-primary/10 px-3 py-1 text-xs font-medium text-ki-primary">
                  {getCategoryLabel(cat)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Left: listings (consultant only) */}
          {isConsultant && (
            <div className="space-y-4 lg:col-span-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Active Services</h2>
              {listings.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-[var(--text-muted)]">No active listings yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {listings.map(listing => {
                    const sym = CURRENCY_SYMBOLS[listing.pricing.currency] ?? '$';
                    const amt = listing.pricing.amount_cents / 100;
                    return (
                      <Link
                        key={listing.id}
                        href={`/listings/${listing.id}`}
                        className="glass-card glass-card-hover flex items-start justify-between gap-4 p-5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="rounded-md border border-ki-primary/25 bg-ki-primary/10 px-2 py-0.5 text-[11px] font-medium text-ki-primary">
                              {getCategoryLabel(listing.category as MarketplaceCategory)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-[var(--text-primary)] line-clamp-1">{listing.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">{listing.description}</p>
                          {(listing.rating ?? 0) > 0 && (
                            <div className="mt-2">
                              <StarRating rating={listing.rating} count={listing.review_count} />
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xl font-bold text-[var(--text-primary)]">{sym}{amt.toLocaleString()}</p>
                          <span className="mt-2 inline-block rounded-xl bg-ki-gradient px-4 py-1.5 text-xs font-semibold text-white">
                            Book Now
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Right: reviews */}
          <div className={isConsultant ? 'lg:col-span-1' : 'lg:col-span-3'}>
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
              Reviews
              {reviews.length > 0 && (
                <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">({reviews.length})</span>
              )}
            </h2>

            {reviews.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <svg className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <p className="text-sm text-[var(--text-muted)]">No reviews yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="glass-card p-4">
                    <div className="flex items-start gap-3">
                      {review.client_photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={review.client_photo} alt={review.client_name}
                          className="h-9 w-9 rounded-full object-cover ring-1 ring-ki-primary/20 shrink-0" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ki-gradient text-sm font-bold text-white">
                          {(review.client_name || 'A').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{review.client_name || 'Anonymous'}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="mt-1 flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg key={i} className={`h-3.5 w-3.5 ${i < review.rating ? 'text-yellow-400' : 'text-[var(--text-muted)]'}`}
                              fill={i < review.rating ? 'currentColor' : 'none'}
                              stroke="currentColor" strokeWidth={i < review.rating ? 0 : 1}
                              viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        {review.comment && (
                          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link href="/marketplace" className="text-sm text-[var(--text-muted)] transition hover:text-ki-primary">
            ← Browse the Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
