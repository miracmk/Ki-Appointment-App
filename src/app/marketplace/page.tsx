import { Suspense } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { MarketplaceFilters } from '@/components/marketplace/filters';
import { ConsultantCard } from '@/components/marketplace/consultant-card';
import { CATEGORIES } from '@/lib/categories';
import type { PublicConsultantInfo } from '@/types/marketplace';

async function getConsultants(searchParams: Record<string, string>): Promise<PublicConsultantInfo[]> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const qs   = new URLSearchParams(searchParams).toString();
    const res  = await fetch(`${base}/api/marketplace/consultants${qs ? `?${qs}` : ''}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.consultants ?? [];
  } catch {
    return [];
  }
}

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const params       = await searchParams;
  const consultants  = await getConsultants(params);
  const activeCategory = params.category ? CATEGORIES.find((c) => c.id === params.category) : null;

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      <Navbar />

      {/* Header */}
      <section className="relative overflow-hidden pt-28 pb-12">
        <div className="pointer-events-none absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-[#0047FF]/15 blur-[100px]" />
        <div className="pointer-events-none absolute top-0 right-1/4 h-64 w-64 rounded-full bg-[#B000FF]/10 blur-[80px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-3 text-4xl font-bold text-white sm:text-5xl">
            {activeCategory ? `${activeCategory.icon} ${activeCategory.label}` : 'All Consultants'}
          </h1>
          <p className="text-white/50">
            {activeCategory
              ? activeCategory.description
              : 'Connect with KYC-verified expert consultants.'}
          </p>

          {/* Category quick links */}
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href="/marketplace"
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                !activeCategory
                  ? 'border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF]'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white'
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
                    ? 'border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF]'
                    : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white'
                }`}
              >
                {cat.icon} {cat.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Main */}
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <Suspense>
            <MarketplaceFilters />
          </Suspense>

          <div className="flex-1">
            {consultants.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] py-20 text-center">
                <svg className="mb-4 h-12 w-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-white/40">No consultants found matching these criteria.</p>
              </div>
            ) : (
              <>
                <p className="mb-6 text-sm text-white/40">{consultants.length} consultant{consultants.length !== 1 ? 's' : ''} found</p>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {consultants.map((c) => (
                    <ConsultantCard key={c.uid} consultant={c} />
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
