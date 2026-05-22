'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFirebaseAuth, getFirestoreClient, isFirebaseConfigured } from '@/lib/firebase-client';
import {
  createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider,
  onAuthStateChanged, updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

type AccountType = 'client' | 'consultant';

export default function RegisterPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const defaultType  = (searchParams.get('type') === 'consultant' ? 'consultant' : 'client') as AccountType;

  const [accountType, setAccountType]       = useState<AccountType>(defaultType);
  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) return;
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.push('/dashboard');
    });
    return () => unsub();
  }, [configured, router]);

  const createUserDoc = async (uid: string, displayName: string, userEmail: string, photoURL: string) => {
    const db = getFirestoreClient();
    if (!db) return;
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email:       userEmail,
        displayName,
        photo_url:   photoURL,
        role:        'client',
        kycStatus:   'unverified',
        walletBalance: 0,
        isActive:    true,
        name:        displayName,
        kyc_status:  'none',
        ki_wallet_cents: 0,
        created_at:  serverTimestamp(),
        updated_at:  Date.now(),
        is_active:   true,
      });
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      if (!auth) { setError('Authentication not configured.'); return; }
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      await createUserDoc(user.uid, user.displayName ?? '', user.email ?? '', user.photoURL ?? '');
      if (accountType === 'consultant') {
        router.push('/dashboard/kyc?apply=consultant');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }
      setError(err.message || 'Google sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) { setError('Authentication not configured.'); return; }
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      await createUserDoc(user.uid, name, user.email ?? '', '');
      if (accountType === 'consultant') {
        router.push('/dashboard/kyc?apply=consultant');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 8 characters.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-16 bg-[var(--surface)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-ki-primary opacity-20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full bg-ki-accent opacity-15 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ki-secondary opacity-10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Ki Business Solutions" className="mx-auto h-10 w-auto" />
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-[var(--text-primary)]">Create Your Account</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Join Ki Business and access expert consulting services.
          </p>
        </div>

        <div className="glass-card p-8">
          {!configured ? (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-600 dark:text-yellow-300">
              Authentication is not configured. Please check environment variables.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Account type toggle */}
              <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--glass-border)', background: 'var(--glass-bg)' }}>
                <button
                  type="button"
                  onClick={() => setAccountType('client')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    accountType === 'client'
                      ? 'bg-ki-gradient text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  I&apos;m a Client
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('consultant')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    accountType === 'consultant'
                      ? 'bg-ki-gradient text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  I&apos;m a Consultant
                </button>
              </div>

              {accountType === 'consultant' && (
                <div className="rounded-xl border border-ki-primary/30 bg-ki-primary/10 p-3 text-sm text-ki-primary">
                  Consultants must complete KYC verification ($5 fee) before going live on the marketplace.
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500 dark:text-red-300">
                  {error}
                </div>
              )}

              {/* Google sign-up */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading}
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
                <span className="text-xs text-[var(--text-muted)]">or register with email</span>
                <div className="h-px flex-1" style={{ background: 'var(--glass-border)' }} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)]">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                    className="input-ki mt-2"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)]">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="input-ki mt-2"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)]">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="input-ki mt-2"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-[var(--text-secondary)]">Confirm Password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat your password"
                    className="input-ki mt-2"
                  />
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  By creating an account you agree to our{' '}
                  <a href="https://kibusiness.co/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-ki-primary hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="https://kibusiness.co/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-ki-primary hover:underline">Privacy Policy</a>.
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-ki-gradient px-6 py-3 font-semibold text-white shadow-lg shadow-ki-primary/20 transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          Already have an account?{' '}
          <Link href="/login" className="text-ki-primary hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
