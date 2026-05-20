'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { signOut } from 'firebase/auth';
import { useUserRole } from '@/lib/use-user-role';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/consultants', label: 'Consultants', icon: '👥' },
  { href: '/admin/tickets', label: 'Support Tickets', icon: '🎫' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const locale   = useLocale();
  const { user, loading } = useUserRole();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      router.push('/unauthorized');
    }
  }, [user, loading, router]);

  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');
  if (loading || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0B0F]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0A0B0F]">
      <aside className="hidden w-56 flex-col border-r border-white/[0.06] bg-[#0D0E14]/80 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center border-b border-white/[0.06] px-5">
          <Link href={`/${locale}`}>
            <img src="/logo.png" alt="Ki Business" className="h-7 w-auto" />
          </Link>
        </div>
        <div className="border-b border-white/[0.06] px-4 py-3 flex items-center gap-2">
          <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400">
            ADMIN
          </span>
          {user?.role === 'superadmin' && (
            <span className="rounded-lg border border-[#B000FF]/30 bg-[#B000FF]/10 px-2.5 py-1 text-xs font-bold text-[#B000FF]">
              SUPER
            </span>
          )}
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
          <p className="mb-0.5 text-xs font-medium text-white/50">{user?.displayName ?? user?.email}</p>
          <p className="mb-2 truncate text-xs text-white/30">{user?.email}</p>
          <button
            type="button"
            onClick={async () => {
              const a = getFirebaseAuth();
              if (a) { await signOut(a); router.push('/login'); }
            }}
            className="text-xs text-white/30 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center border-b border-white/[0.06] bg-[#0A0B0F]/80 px-6 backdrop-blur-xl">
          <span className="text-sm font-semibold text-white/50">Ki Business Admin Panel</span>
        </header>
        <main className="flex-1 overflow-auto bg-gradient-to-br from-[#0A0B0F] via-[#0D0E14] to-[#0A0B0F] p-6">{children}</main>
      </div>
    </div>
  );
}
