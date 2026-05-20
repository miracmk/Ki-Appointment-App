'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';

const LANGUAGES = ['Turkish', 'English', 'German', 'French', 'Arabic', 'Spanish', 'Russian'];

export function MarketplaceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minRate, setMinRate]     = useState(Number(searchParams.get('minRate') ?? 0));
  const [maxRate, setMaxRate]     = useState(Number(searchParams.get('maxRate') ?? 500));
  const [minRating, setMinRating] = useState(Number(searchParams.get('rating') ?? 0));
  const [langs, setLangs]         = useState<string[]>(
    searchParams.get('lang') ? searchParams.get('lang')!.split(',') : []
  );
  const [cats, setCats]           = useState<string[]>(
    searchParams.get('category') ? searchParams.get('category')!.split(',') : []
  );

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    if (minRate > 0)    params.set('minRate', String(minRate));
    if (maxRate < 500)  params.set('maxRate', String(maxRate));
    if (minRating > 0)  params.set('rating', String(minRating));
    if (langs.length)   params.set('lang', langs.join(','));
    if (cats.length)    params.set('category', cats.join(','));
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, minRate, maxRate, minRating, langs, cats]);

  const reset = useCallback(() => {
    setMinRate(0); setMaxRate(500); setMinRating(0); setLangs([]); setCats([]);
    router.push(pathname);
  }, [router, pathname]);

  const toggleLang = (l: string) =>
    setLangs((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);

  const toggleCat = (c: string) =>
    setCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  return (
    <aside className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm lg:w-64 lg:shrink-0">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-semibold text-white">Filter</h2>
        <button
          type="button"
          onClick={reset}
          className="text-xs text-white/40 transition hover:text-white"
        >
          Reset
        </button>
      </div>

      {/* Price range */}
      <div className="mb-6">
        <p className="mb-3 text-sm font-medium text-white/70">
          Hourly Rate: ${minRate} – ${maxRate === 500 ? '500+' : maxRate}
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-8 text-xs text-white/40">Min</span>
            <input
              type="range"
              min={0} max={500} step={25}
              value={minRate}
              onChange={(e) => setMinRate(Number(e.target.value))}
              className="w-full accent-[#00F0FF]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 text-xs text-white/40">Max</span>
            <input
              type="range"
              min={0} max={500} step={25}
              value={maxRate}
              onChange={(e) => setMaxRate(Number(e.target.value))}
              className="w-full accent-[#00F0FF]"
            />
          </div>
        </div>
      </div>

      {/* Minimum rating */}
      <div className="mb-6">
        <p className="mb-3 text-sm font-medium text-white/70">Minimum Rating</p>
        <div className="flex gap-2">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setMinRating(r)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                minRating === r
                  ? 'border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF]'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white'
              }`}
            >
              {r === 0 ? 'All' : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className="mb-6">
        <p className="mb-3 text-sm font-medium text-white/70">Language</p>
        <div className="space-y-2">
          {LANGUAGES.map((l) => (
            <label key={l} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={langs.includes(l)}
                onChange={() => toggleLang(l)}
                className="h-4 w-4 rounded accent-[#00F0FF]"
              />
              <span className={`text-sm ${langs.includes(l) ? 'text-white' : 'text-white/50'}`}>{l}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <p className="mb-3 text-sm font-medium text-white/70">Category</p>
        <div className="space-y-2">
          {CATEGORIES.map((cat) => (
            <label key={cat.id} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={cats.includes(cat.id)}
                onChange={() => toggleCat(cat.id)}
                className="h-4 w-4 rounded accent-[#00F0FF]"
              />
              <span className={`text-sm ${cats.includes(cat.id) ? 'text-white' : 'text-white/50'}`}>
                {cat.icon} {cat.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={apply}
        className="w-full rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Apply Filters
      </button>
    </aside>
  );
}
