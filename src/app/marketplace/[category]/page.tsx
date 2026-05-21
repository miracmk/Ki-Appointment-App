import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { MarketplaceFilters } from '@/components/marketplace/filters';
import { ListingCard, type PublicListing } from '@/components/marketplace/listing-card';
import { CATEGORIES, getCategoryMeta } from '@/lib/categories';
import type { MarketplaceCategory } from '@/types/marketplace';

async function getListings(category: string, searchParams: Record<string, string>): Promise<PublicListing[]> {
  try {
    const base   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const params = new URLSearchParams({ category });
    if (searchParams.minPrice) params.set('minPrice', searchParams.minPrice);
    if (searchParams.maxPrice) params.set('maxPrice', searchParams.maxPrice);
    if (searchParams.lang)     params.set('lang', searchParams.lang);
    const res = await fetch(`${base}/api/marketplace/listings?${params.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.listings ?? [];
  } catch {
    return [];
  }
}

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }));
}

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string>>;
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;
  const sp           = await searchParams;
  const meta         = getCategoryMeta(category as MarketplaceCategory);

  if (!meta) notFound();

  const listings = await getListings(category, sp);

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      <Navbar />

      <div className="pointer-events-none fixed -top-32 left-1/4 h-96 w-96 rounded-full bg-[#0047FF]/10 blur-[120px]" />
      <div className="pointer-events-none fixed top-20 right-1/4 h-72 w-72 rounded-full bg-[#B000FF]/8 blur-[100px]" />

      {/* Header */}
      <section className="relative overflow-hidden pt-28 pb-10">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2 text-sm text-white/40">
            <a href="/marketplace" className="transition hover:text-white">Marketplace</a>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-white/70">{meta.label}</span>
          </div>

          <h1 className="mb-2 text-4xl font-bold text-white sm:text-5xl">
            {meta.icon} {meta.label}
          </h1>
          <p className="max-w-2xl text-white/50">{meta.description}</p>

          {/* Sub-specialty tags */}
          <div className="mt-5 flex flex-wrap gap-2">
            {meta.subSpecialties.map((s) => (
              <span key={s} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/40">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Main */}
      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <Suspense>
            <MarketplaceFilters mode="listings" />
          </Suspense>

          <div className="flex-1">
            {listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] py-24 text-center">
                <span className="mb-4 text-5xl">{meta.icon}</span>
                <p className="font-medium text-white/50">No listings in this category yet</p>
                <p className="mt-1 text-sm text-white/30">Check back soon or browse other categories.</p>
                <a href="/marketplace" className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:text-white">
                  ← All categories
                </a>
              </div>
            ) : (
              <>
                <p className="mb-5 text-sm text-white/40">
                  {listings.length} listing{listings.length !== 1 ? 's' : ''} in {meta.label}
                </p>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {listings.map((l) => (
                    <ListingCard key={l.id} listing={l} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
