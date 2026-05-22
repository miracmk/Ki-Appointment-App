'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ThemeToggle } from '@/components/theme-toggle';

export function Navbar() {
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [user,           setUser]           = useState<{ displayName: string | null; email: string | null } | null>(null);
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); return; }
      let displayName = u.displayName;
      if (!displayName) {
        try {
          const db = getFirestoreClient();
          if (db) {
            const snap = await getDoc(doc(db, 'users', u.uid));
            if (snap.exists()) {
              const d = snap.data();
              displayName = d.display_name || d.displayName || d.name
                || (d.first_name ? `${d.first_name} ${d.last_name ?? ''}`.trim() : null);
            }
          }
        } catch { /* ignore */ }
      }
      setUser({ displayName, email: u.email });
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  return (
    <nav
      className="fixed top-0 z-50 w-full backdrop-blur-xl transition-colors duration-200"
      style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--glass-border)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href={'/'} className="flex shrink-0 items-center gap-2">
          <img src="/logo.png" alt="Ki Business Solutions" className="h-8 w-auto" />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setCategoriesOpen(true)}
            onMouseLeave={() => setCategoriesOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ki-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              Consultants
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {categoriesOpen && (
              <div
                className="absolute left-0 top-full mt-2 w-72 rounded-2xl p-3 backdrop-blur-xl"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                }}
              >
                <div className="grid grid-cols-1 gap-1">
                  {CATEGORIES.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/marketplace/${cat.id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(38,166,154,0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <p className="text-sm font-medium">{cat.label}</p>
                    </Link>
                  ))}
                </div>
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                  <Link
                    href={'/marketplace'}
                    className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150"
                    style={{ color: 'var(--ki-primary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(38,166,154,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    View All Consultants
                  </Link>
                </div>
              </div>
            )}
          </div>

          <NavLink href={'/marketplace'}>Marketplace</NavLink>
          <NavLink href={'/#how-it-works'}>How It Works</NavLink>
        </div>

        {/* Desktop auth + theme toggle */}
        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          {user ? (
            <>
              <span
                className="max-w-[140px] truncate text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                {user.displayName || user.email}
              </span>
              <Link
                href="/dashboard"
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200"
                style={{
                  border: '1px solid rgba(38,166,154,0.35)',
                  background: 'rgba(38,166,154,0.10)',
                  color: 'var(--ki-primary)',
                }}
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-sm font-medium transition-colors duration-150"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <NavLink href={'/login'}>Login</NavLink>
              <NavLink href={'/register'}>Register</NavLink>
              <Link
                href={'/marketplace'}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:opacity-90 hover:shadow-[0_0_24px_rgba(38,166,154,0.40)]"
                style={{ background: 'linear-gradient(135deg, #26A69A 0%, #2D8A6B 100%)' }}
              >
                Book Now
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="rounded-lg p-2 transition-colors duration-150 lg:hidden"
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="px-4 py-4 backdrop-blur-xl lg:hidden"
          style={{ background: 'var(--nav-bg)', borderTop: '1px solid var(--glass-border)' }}
        >
          <div className="space-y-1">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/marketplace/${cat.id}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => setMobileOpen(false)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(38,166,154,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span>{cat.icon}</span>{cat.label}
              </Link>
            ))}
            <div className="my-3" style={{ borderTop: '1px solid var(--glass-border)' }} />
            <Link
              href={'/marketplace'}
              className="block rounded-xl px-3 py-2.5 text-sm transition-colors duration-150"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setMobileOpen(false)}
            >
              Marketplace
            </Link>
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150"
                  style={{ color: 'var(--ki-primary)' }}
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); handleSignOut(); }}
                  className="block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href={'/login'}
                  className="block rounded-xl px-3 py-2.5 text-sm transition-colors duration-150"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href={'/register'}
                  className="block rounded-xl px-3 py-2.5 text-sm transition-colors duration-150"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => setMobileOpen(false)}
                >
                  Register
                </Link>
                <Link
                  href={'/marketplace'}
                  className="mt-2 block rounded-xl px-4 py-3 text-center text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #26A69A 0%, #2D8A6B 100%)' }}
                  onClick={() => setMobileOpen(false)}
                >
                  Book Now
                </Link>
              </>
            )}
            <div className="mt-3 flex items-center justify-between px-3">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium transition-colors duration-150"
      style={{ color: 'var(--text-secondary)' }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ki-primary)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
    >
      {children}
    </Link>
  );
}
