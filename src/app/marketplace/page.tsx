import { Suspense } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { MarketplaceFilters } from '@/components/marketplace/filters';
import { ListingCard, type PublicListing } from '@/components/marketplace/listing-card';
import { CATEGORIES } from '@/lib/categories';

async function getListings(searchParams: Record<string, string>): Promise<PublicListing[]> {
  try {
    const base   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const params = new URLSearchParams();
    if (searchParams.category) params.set('category', searchParams.category);
    if (searchParams.minPrice)  params.set('minPrice', searchParams.minPrice);
    if (searchParams.maxPrice)  params.set('maxPrice', searchParams.maxPrice);
    if (searchParams.lang)      params.set('lang', searchParams.lang);
    const qs  = params.toString();
    const res = await fetch(`${base}/api/marketplace/listings${qs ? `?${qs}` : ''}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.listings ?? [];
  } catch {
    return [];
  }
}

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const params         = await searchParams;
  const listings       = await getListings(params);
  const activeCategory = params.category ? CATEGORIES.find((c) => c.id === params.category) : null;

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)]">
      <Navbar />

      {/* Ki teal blobs */}
      <div className="pointer-events-none fixed -top-32 left-1/4 h-96 w-96 rounded-full bg-ki-primary/10 blur-[120px]" />
      <div className="pointer-events-none fixed top-20 right-1/4 h-72 w-72 rounded-full bg-ki-accent/8 blur-[100px]" />

      {/* Header */}
      <section className="relative overflow-hidden pt-28 pb-10">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-2 text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">
            {activeCategory ? `${activeCategory.icon} ${activeCategory.label}` : 'Consulting Services'}
          </h1>
          <p className="text-[var(--text-secondary)]">
            {activeCategory
              ? activeCategory.description
              : 'Browse expert consulting services across all categories.'}
          </p>

          {/* Category pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href="/marketplace"
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                !activeCategory
                  ? 'border-ki-primary/50 bg-ki-primary/10 text-ki-primary'
                  : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] hover:border-ki-primary/30 hover:text-ki-primary'
              }`}
            >
              All
            </a>
            {CATEGORIES.map((cat) => (
              <a
                key={cat.id}
                href={`/marketplace/${cat.id}`}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  activeCategory?.id === cat.id
                    ? 'border-ki-primary/50 bg-ki-primary/10 text-ki-primary'
                    : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] hover:border-ki-primary/30 hover:text-ki-primary'
                }`}
              >
                {cat.icon} {cat.label}
              </a>
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
              <div className="glass-card flex flex-col items-center justify-center py-24 text-center">
                <p className="mb-3 text-5xl">📋</p>
                <p className="font-medium text-[var(--text-secondary)]">No listings found</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {activeCategory
                    ? 'No active listings in this category yet.'
                    : 'No consulting listings are available at the moment.'}
                </p>
              </div>
            ) : (
              <>
                <p className="mb-5 text-sm text-[var(--text-muted)]">
                  {listings.length} listing{listings.length !== 1 ? 's' : ''} found
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
