'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const locale = useLocale();
  const pathname = usePathname();

  const localeHref = (path: string) => {
    if (path === '/') return `/${locale}`;
    return `/${locale}${path}`;
  };

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/[0.08] bg-[#0A0B0F]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href={localeHref('/')} className="flex shrink-0 items-center gap-2">
          <img src="/logo.png" alt="Ki Business Solutions" className="h-8 w-auto" />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <div className="relative" onMouseEnter={() => setCategoriesOpen(true)} onMouseLeave={() => setCategoriesOpen(false)}>
            <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white">
              Consultants
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {categoriesOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-white/10 bg-[#12141A]/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                <div className="grid grid-cols-1 gap-1">
                  {CATEGORIES.map((cat) => (
                    <Link key={cat.id} href={localeHref(`/marketplace/${cat.id}`)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5">
                      <span className="text-xl">{cat.icon}</span>
                      <p className="text-sm font-medium text-white">{cat.label}</p>
                    </Link>
                  ))}
                </div>
                <div className="mt-2 border-t border-white/[0.08] pt-2">
                  <Link href={localeHref('/marketplace')} className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#00F0FF] transition hover:bg-[#00F0FF]/10">
                    View All Consultants
                  </Link>
                </div>
              </div>
            )}
          </div>
          <Link href={localeHref('/marketplace')} className="text-sm font-medium text-white/70 transition hover:text-white">Marketplace</Link>
          <Link href={localeHref('/#how-it-works')} className="text-sm font-medium text-white/70 transition hover:text-white">How It Works</Link>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href={localeHref('/login')} className="text-sm font-medium text-white/70 transition hover:text-white">Login</Link>
          <Link href={localeHref('/register')} className="text-sm font-medium text-white/70 transition hover:text-white">Register</Link>
          <Link href={localeHref('/marketplace')} className="rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90">
            Book Now
          </Link>
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
            <Link href={localeHref('/marketplace')} className="block rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>Marketplace</Link>
            <Link href={localeHref('/login')} className="block rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>Login</Link>
            <Link href={localeHref('/register')} className="block rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>Register</Link>
            <Link href={localeHref('/marketplace')} className="mt-2 block rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-4 py-3 text-center text-sm font-semibold text-white" onClick={() => setMobileOpen(false)}>
              Book Now
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
