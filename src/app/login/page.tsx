'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth, getFirestoreClient, isFirebaseConfigured } from '@/lib/firebase-client';
import {
  signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function LoginPage() {
  const locale    = useLocale();
  const router    = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) return;
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (user) router.push('/dashboard');
    });
    return () => unsub();
  }, [configured, router, locale]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      if (!auth) { setError('Authentication not configured.'); return; }
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(err.message || 'Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      if (!auth) { setError('Authentication not configured.'); return; }
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      const db = getFirestoreClient();
      if (db) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) {
          await setDoc(doc(db, 'users', user.uid), {
            uid:         user.uid,
            email:       user.email ?? '',
            displayName: user.displayName ?? '',
            photo_url:   user.photoURL   ?? '',
            role:        'client',
            kycStatus:   'unverified',
            walletBalance: 0,
            isActive:    true,
            name:        user.displayName ?? '',
            kyc_status:  'none',
            ki_wallet_cents: 0,
            created_at:  Date.now(),
            updated_at:  Date.now(),
            is_active:   true,
          });
        }
      }
      router.push('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 bg-[var(--surface)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-ki-primary opacity-20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full bg-ki-accent opacity-15 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ki-secondary opacity-10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href={`/${locale}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Ki Business Solutions" className="mx-auto h-10 w-auto" />
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-[var(--text-primary)]">Sign In to Your Account</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Use the email and password sent after your first consultation purchase.
          </p>
        </div>

        <div className="glass-card p-8">
          {!configured ? (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-600 dark:text-yellow-300">
              Authentication is not configured. Please check environment variables:
              <code className="mt-2 block text-xs opacity-70">
                NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID
              </code>
            </div>
          ) : (
            <div className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500 dark:text-red-300">
                  {error}
                </div>
              )}

              {/* Google sign-in */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || !authReady}
                className="flex w-full items-center justify-center gap-3 rounded-xl border px-6 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-ki-primary/5 disabled:opacity-50"
                style={{ borderColor: 'var(--glass-border)', background: 'var(--glass-bg)' }}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: 'var(--glass-border)' }} />
                <span className="text-xs text-[var(--text-muted)]">or sign in with email</span>
                <div className="h-px flex-1" style={{ background: 'var(--glass-border)' }} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)]">Email address</label>
                  <input
                    id="email" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required placeholder="you@example.com"
                    className="input-ki mt-2"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)]">Password</label>
                  <input
                    id="password" type="password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required placeholder="••••••••"
                    className="input-ki mt-2"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !authReady}
                  className="w-full rounded-xl bg-ki-gradient px-6 py-3 font-semibold text-white shadow-lg shadow-ki-primary/20 transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Don&apos;t have an account?{' '}
          <Link href={`/${locale}/register`} className="text-ki-primary hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
}
