'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';
import { LOCALE_LABELS, SUPPORTED_LOCALES } from '@/lib/i18n';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const cleanPath = pathname.replace(new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})`), '') || '/';
  const query = searchParams.toString();
  const buildLocalePath = (targetLocale: string, path: string) => {
    const normalized = path === '/' ? '' : path;
    const url = `/${targetLocale}${normalized}`;
    return query ? `${url}?${query}` : url;
  };

  const handleLocaleChange = (targetLocale: string) => {
    router.push(buildLocalePath(targetLocale, cleanPath));
  };

  const localeHref = (path: string) => buildLocalePath(locale, path);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/[0.08] bg-[#0A0B0F]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href={localeHref('/')} className="flex shrink-0 items-center gap-2">
          <img src="/logo.png" alt="Ki Business Solutions" className="h-8 w-auto" />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <div className="relative" onMouseEnter={() => setCategoriesOpen(true)} onMouseLeave={() => setCategoriesOpen(false)}>
            <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white">
              Danışmanlar
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {categoriesOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl border border-white/10 bg-[#12141A]/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                <div className="grid grid-cols-1 gap-1">
                  {CATEGORIES.map((cat) => (
                    <Link key={cat.id} href={localeHref(`/marketplace/${cat.id}`)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5">
                      <span className="text-xl">{cat.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{cat.label}</p>
                        <p className="text-xs text-white/40">{cat.labelTr}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-2 border-t border-white/[0.08] pt-2">
                  <Link href={localeHref('/marketplace')} className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#00F0FF] hover:bg-[#00F0FF]/10 transition">Tum Danismanlar</Link>
                </div>
              </div>
            )}
          </div>
          <Link href={localeHref('/marketplace')} className="text-sm font-medium text-white/70 transition hover:text-white">{t('nav.marketplace')}</Link>
          <Link href={localeHref('/#how-it-works')} className="text-sm font-medium text-white/70 transition hover:text-white">{t('section.howItWorks')}</Link>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href={localeHref('/login')} className="text-sm font-medium text-white/70 transition hover:text-white">{t('nav.login')}</Link>
          <Link href={localeHref('/marketplace')} className="rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90">{t('action.bookNow')}</Link>
          <select
            value={locale}
            onChange={(event) => handleLocaleChange(event.target.value)}
            className="rounded-xl border border-white/10 bg-[#0A0B0F] px-3 py-2 text-sm text-white outline-none transition focus:border-[#00F0FF]/50 focus:ring-2 focus:ring-[#00F0FF]/20"
          >
            {SUPPORTED_LOCALES.map((lang) => (
              <option key={lang} value={lang} className="text-black">
                {LOCALE_LABELS[lang]}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="rounded-lg p-2 text-white/70 hover:text-white lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/[0.08] bg-[#0A0B0F]/95 px-4 py-4 backdrop-blur-xl lg:hidden">
          <div className="space-y-1">
            {CATEGORIES.map((cat) => (
              <Link key={cat.id} href={localeHref(`/marketplace/${cat.id}`)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>
                <span>{cat.icon}</span>{cat.label}
              </Link>
            ))}
            <div className="my-3 border-t border-white/[0.08]" />
            <Link href={localeHref('/login')} className="block rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>{t('nav.login')}</Link>
            <Link href={localeHref('/marketplace')} className="mt-2 block rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-4 py-3 text-center text-sm font-semibold text-white" onClick={() => setMobileOpen(false)}>{t('action.bookNow')}</Link>
            <div className="mt-4">
              <label htmlFor="locale-select" className="sr-only">Language</label>
              <select
                id="locale-select"
                value={locale}
                onChange={(event) => {
                  setMobileOpen(false);
                  handleLocaleChange(event.target.value);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#0A0B0F] px-3 py-2 text-sm text-white outline-none"
              >
                {SUPPORTED_LOCALES.map((lang) => (
                  <option key={lang} value={lang} className="text-black">
                    {LOCALE_LABELS[lang]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
