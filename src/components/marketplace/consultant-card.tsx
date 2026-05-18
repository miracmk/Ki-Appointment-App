import Link from 'next/link';
import type { PublicConsultantInfo } from '@/types/marketplace';
import { getCategoryLabel } from '@/lib/categories';
import { Avatar } from '@/components/ui/avatar';

interface ConsultantCardProps {
  consultant: PublicConsultantInfo;
}

const CATEGORY_COLORS: Record<string, string> = {
  accounting_tax:       'border-[#00F0FF]/20 text-[#00F0FF] bg-[#00F0FF]/10',
  law_corporate:        'border-[#B000FF]/20 text-[#B000FF] bg-[#B000FF]/10',
  immigration_visa:     'border-[#0047FF]/20 text-[#0047FF] bg-[#0047FF]/10',
  financial_investment: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10',
  customs_trade:        'border-orange-500/20 text-orange-400 bg-orange-500/10',
  trademark_ip:         'border-[#FF006E]/20 text-[#FF006E] bg-[#FF006E]/10',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'text-yellow-400' : 'text-white/15'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function ConsultantCard({ consultant }: ConsultantCardProps) {
  const categoryLabel = getCategoryLabel(consultant.categories[0]);
  const colorClass = CATEGORY_COLORS[consultant.categories[0]] ?? 'border-white/15 text-white/60 bg-white/5';

  return (
    <div className="group flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm transition duration-300 hover:border-white/20 hover:bg-white/[0.06]">
      {/* Header */}
      <div className="mb-4 flex items-start gap-4">
        <Avatar
          src={consultant.photo_url}
          name={consultant.name}
          size="lg"
          ring="cyan"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white">{consultant.name}</h3>
              {consultant.title && (
                <p className="mt-0.5 text-sm text-white/50">{consultant.title}</p>
              )}
            </div>
            {consultant.is_ki_business && (
              <span className="shrink-0 rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2 py-0.5 text-xs font-semibold text-[#00F0FF]">
                Ki Business
              </span>
            )}
          </div>
          {consultant.location && (
            <p className="mt-1 flex items-center gap-1 text-xs text-white/35">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {consultant.location}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {consultant.bio && (
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-white/50">
          {consultant.bio}
        </p>
      )}

      {/* Tags */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${colorClass}`}>
          {categoryLabel}
        </span>
        {consultant.sub_specialties.slice(0, 2).map((s) => (
          <span key={s} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/50">
            {s}
          </span>
        ))}
      </div>

      {/* Languages */}
      {consultant.languages.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {consultant.languages.map((lang) => (
            <span key={lang} className="rounded-md bg-white/[0.04] px-2 py-0.5 text-xs text-white/40">
              {lang}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto">
        {/* Rating + Rate */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StarRating rating={consultant.rating} />
            <span className="text-sm font-medium text-white">{consultant.rating.toFixed(1)}</span>
            <span className="text-sm text-white/35">({consultant.review_count})</span>
          </div>
          <div className="text-right">
            <span className="text-base font-bold text-white">
              ${(consultant.hourly_rate_cents / 100).toFixed(0)}
            </span>
            <span className="text-sm text-white/40">/saat</span>
          </div>
        </div>

        {/* KYC badge + CTA */}
        <div className="flex items-center justify-between gap-3">
          {consultant.kyc_status === 'verified' && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              KYC Doğrulandı
            </span>
          )}
          <Link
            href={`/consultants/${consultant.uid}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Randevu Al
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
