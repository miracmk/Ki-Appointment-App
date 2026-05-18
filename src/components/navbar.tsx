'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/[0.08] bg-[#0A0B0F]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <img src="https://media.base44.com/images/public/6a06e6fe65cabb7bc81457a9/e0090f321_KiBusinessLogoYatayBeyazYenipng.png" alt="Ki Business Solutions" className="h-8 w-auto" />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <div className="relative" onMouseEnter={() => setCategoriesOpen(true)} onMouseLeave={() => setCategoriesOpen(false)}>
            <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white">
              Danismanlar
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {categoriesOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl border border-white/10 bg-[#12141A]/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                <div className="grid grid-cols-1 gap-1">
                  {CATEGORIES.map((cat) => (
                    <Link key={cat.id} href={`/marketplace/${cat.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5">
                      <span className="text-xl">{cat.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{cat.label}</p>
                        <p className="text-xs text-white/40">{cat.labelTr}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-2 border-t border-white/[0.08] pt-2">
                  <Link href="/marketplace" className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#00F0FF] hover:bg-[#00F0FF]/10 transition">Tum Danismanlar</Link>
                </div>
              </div>
            )}
          </div>
          <Link href="/marketplace" className="text-sm font-medium text-white/70 transition hover:text-white">Marketplace</Link>
          <Link href="/#how-it-works" className="text-sm font-medium text-white/70 transition hover:text-white">Nasil Calisir</Link>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className="text-sm font-medium text-white/70 transition hover:text-white">Giris Yap</Link>
          <Link href="/marketplace" className="rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90">Danishman Bul</Link>
        </div>

        <button type="button" className="rounded-lg p-2 text-white/70 hover:text-white lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/[0.08] bg-[#0A0B0F]/95 px-4 py-4 backdrop-blur-xl lg:hidden">
          <div className="space-y-1">
            {CATEGORIES.map((cat) => (
              <Link key={cat.id} href={`/marketplace/${cat.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>
                <span>{cat.icon}</span>{cat.label}
              </Link>
            ))}
            <div className="my-3 border-t border-white/[0.08]" />
            <Link href="/login" className="block rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>Giris Yap</Link>
            <Link href="/marketplace" className="mt-2 block rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-4 py-3 text-center text-sm font-semibold text-white" onClick={() => setMobileOpen(false)}>Danishman Bul</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
