import { notFound } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Avatar } from '@/components/ui/avatar';
import { MarketplaceCheckout } from '@/components/marketplace/checkout';
import { getCategoryLabel } from '@/lib/categories';
import type { PublicConsultantInfo } from '@/types/marketplace';

async function getConsultant(uid: string): Promise<PublicConsultantInfo | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res  = await fetch(`${base}/api/marketplace/consultants/${uid}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.consultant ?? null;
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default async function ConsultantProfilePage({ params }: PageProps) {
  const { uid }    = await params;
  const consultant = await getConsultant(uid);

  if (!consultant) notFound();

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-sm text-white/40">
          <a href="/marketplace" className="transition hover:text-white">Danışmanlar</a>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-white/70">{consultant.name}</span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile header */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <Avatar
                  src={consultant.photo_url}
                  name={consultant.name}
                  size="xl"
                  ring="cyan"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-bold text-white">{consultant.name}</h1>
                      {consultant.title && (
                        <p className="mt-1 text-white/60">{consultant.title}</p>
                      )}
                      {consultant.location && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-white/40">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {consultant.location}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        ${(consultant.hourly_rate_cents / 100).toFixed(0)}
                        <span className="text-base font-normal text-white/40">/saat</span>
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="font-semibold text-white">{consultant.rating.toFixed(1)}</span>
                        <span className="text-sm text-white/40">({consultant.review_count} değerlendirme)</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {consultant.kyc_status === 'verified' && (
                      <span className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        KYC Doğrulandı
                      </span>
                    )}
                    {consultant.is_ki_business && (
                      <span className="rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-3 py-1 text-xs font-semibold text-[#00F0FF]">
                        Ki Business
                      </span>
                    )}
                    {consultant.categories.map((cat) => (
                      <span key={cat} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
                        {getCategoryLabel(cat)}
                      </span>
                    ))}
                  </div>

                  {/* Languages */}
                  {consultant.languages.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {consultant.languages.map((lang) => (
                        <span key={lang} className="rounded-md bg-white/[0.04] px-2.5 py-1 text-xs text-white/40">
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {consultant.bio && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
                <h2 className="mb-3 text-lg font-semibold text-white">Hakkında</h2>
                <p className="leading-relaxed text-white/60">{consultant.bio}</p>
              </div>
            )}

            {/* Specialties */}
            {consultant.sub_specialties.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
                <h2 className="mb-4 text-lg font-semibold text-white">Uzmanlık Alanları</h2>
                <div className="flex flex-wrap gap-2">
                  {consultant.sub_specialties.map((s) => (
                    <span
                      key={s}
                      className="rounded-xl border border-[#00F0FF]/15 bg-[#00F0FF]/5 px-3 py-1.5 text-sm text-[#00F0FF]/80"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: booking form */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
              <h2 className="mb-5 text-lg font-semibold text-white">Randevu Al</h2>
              <MarketplaceCheckout consultantId={consultant.uid} />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
