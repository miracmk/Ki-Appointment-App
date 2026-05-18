import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { MarketplaceFilters } from '@/components/marketplace/filters';
import { ConsultantCard } from '@/components/marketplace/consultant-card';
import { CATEGORIES, getCategoryMeta } from '@/lib/categories';
import type { PublicConsultantInfo, MarketplaceCategory } from '@/types/marketplace';

async function getConsultants(category: string, searchParams: Record<string, string>): Promise<PublicConsultantInfo[]> {
  try {
    const base   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const params = new URLSearchParams({ ...searchParams, category });
    const res    = await fetch(`${base}/api/marketplace/consultants?${params.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.consultants ?? [];
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
  const { category }  = await params;
  const sp            = await searchParams;
  const meta          = getCategoryMeta(category as MarketplaceCategory);

  if (!meta) notFound();

  const consultants = await getConsultants(category, sp);

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      <Navbar />

      {/* Header */}
      <section className="relative overflow-hidden pt-28 pb-12">
        <div className="pointer-events-none absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-[#0047FF]/15 blur-[100px]" />
        <div className="pointer-events-none absolute top-0 right-1/4 h-64 w-64 rounded-full bg-[#B000FF]/10 blur-[80px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2 text-sm text-white/40">
            <a href="/marketplace" className="transition hover:text-white">Tüm Danışmanlar</a>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-white/70">{meta.label}</span>
          </div>
          <h1 className="mb-3 text-4xl font-bold text-white sm:text-5xl">
            {meta.icon} {meta.label}
          </h1>
          <p className="max-w-2xl text-white/50">{meta.description}</p>

          {/* Sub-specialties */}
          <div className="mt-6 flex flex-wrap gap-2">
            {meta.subSpecialties.map((s) => (
              <span
                key={s}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50"
              >
                {s}
              </span>
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
                <span className="mb-4 text-5xl">{meta.icon}</span>
                <p className="text-white/40">Bu kategoride henüz danışman bulunamadı.</p>
              </div>
            ) : (
              <>
                <p className="mb-6 text-sm text-white/40">{consultants.length} danışman bulundu</p>
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
