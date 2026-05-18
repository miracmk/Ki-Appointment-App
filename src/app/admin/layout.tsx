'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/consultants', label: 'Danışmanlar', icon: '👥' },
  { href: '/admin/tickets', label: 'Destek Talepleri', icon: '🎫' },
  { href: '/admin/integrations', label: 'Ayarlar', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [email, setEmail]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { router.push('/login'); return; }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push('/login'); return; }
      if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email ?? '')) {
        router.push('/dashboard');
        return;
      }
      setEmail(user.email);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0B0F]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0B0F]">
      <aside className="hidden w-56 flex-col border-r border-white/[0.06] bg-[#0D0E14] lg:flex">
        <div className="flex h-16 items-center border-b border-white/[0.06] px-5">
          <Link href="/">
            <img src="https://media.base44.com/images/public/6a06e6fe65cabb7bc81457a9/e0090f321_KiBusinessLogoYatayBeyazYenipng.png" alt="Ki Business" className="h-7 w-auto" />
          </Link>
        </div>
        <div className="border-b border-white/[0.06] px-4 py-3">
          <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400">
            ADMIN
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-red-500/10 text-red-400' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/[0.06] p-4">
          <p className="mb-2 truncate text-xs text-white/30">{email}</p>
          <button
            type="button"
            onClick={async () => { const a = getFirebaseAuth(); if (a) { await signOut(a); router.push('/login'); } }}
            className="text-xs text-white/30 hover:text-white"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center border-b border-white/[0.06] bg-[#0A0B0F]/80 px-6 backdrop-blur-xl">
          <span className="text-sm font-semibold text-white/50">Ki Business Admin Panel</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
