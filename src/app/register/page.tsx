'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase-client';
import { createUserWithEmailAndPassword, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { getFirestoreClient } from '@/lib/firebase-client';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

type AccountType = 'client' | 'consultant';

export default function RegisterPage() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = (searchParams.get('type') === 'consultant' ? 'consultant' : 'client') as AccountType;

  const [accountType, setAccountType] = useState<AccountType>(defaultType);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
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
  }, [configured, router, locale]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) { setError('Authentication not configured.'); return; }

      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });

      const db = getFirestoreClient();
      if (db) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          name,
          role: accountType,
          kyc_status: 'none',
          ki_wallet_cents: 0,
          created_at: serverTimestamp(),
          is_active: true,
        });
      }

      if (accountType === 'consultant') {
        router.push('/consultant/kyc');
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
    <div className="relative min-h-screen overflow-hidden bg-[#0A0B0F] flex items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#0047FF] opacity-20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full bg-[#B000FF] opacity-20 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00F0FF] opacity-10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href={`/${locale}`}>
            <img src="/logo.png" alt="Ki Business Solutions" className="mx-auto h-10 w-auto" />
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Create Your Account</h1>
          <p className="mt-2 text-sm text-white/50">
            Join Ki Business and access expert consulting services.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          {!configured ? (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
              Authentication is not configured. Please check environment variables.
            </div>
          ) : (
            <>
              {/* Account type toggle */}
              <div className="mb-6 flex rounded-xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setAccountType('client')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    accountType === 'client'
                      ? 'bg-gradient-to-r from-[#0047FF] to-[#00F0FF] text-white'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  I&apos;m a Client
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('consultant')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    accountType === 'consultant'
                      ? 'bg-gradient-to-r from-[#B000FF] to-[#0047FF] text-white'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  I&apos;m a Consultant
                </button>
              </div>

              {accountType === 'consultant' && (
                <div className="mb-5 rounded-xl border border-[#B000FF]/30 bg-[#B000FF]/10 p-3 text-sm text-[#B000FF]">
                  Consultants must complete KYC verification ($5 fee) before going live on the marketplace.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white/70">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-[#00F0FF]/50 focus:ring-2 focus:ring-[#00F0FF]/20"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/70">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-[#00F0FF]/50 focus:ring-2 focus:ring-[#00F0FF]/20"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white/70">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-[#00F0FF]/50 focus:ring-2 focus:ring-[#00F0FF]/20"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-white/70">Confirm Password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat your password"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-[#00F0FF]/50 focus:ring-2 focus:ring-[#00F0FF]/20"
                  />
                </div>

                <p className="text-xs text-white/30">
                  By creating an account you agree to our{' '}
                  <a href="https://kibusiness.co/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-[#00F0FF] hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="https://kibusiness.co/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#00F0FF] hover:underline">Privacy Policy</a>.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-6 py-3 font-semibold text-white shadow-lg shadow-[#0047FF]/30 transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          Already have an account?{' '}
          <Link href={`/${locale}/login`} className="text-[#00F0FF] hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
