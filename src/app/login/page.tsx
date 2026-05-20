'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase-client';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

export default function LoginPage() {
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) return;
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (user) router.push(`/${locale}/dashboard`);
    });
    return () => unsub();
  }, [configured, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      if (!auth) { setError('Firebase yapılandırılmamış.'); return; }
      await signInWithEmailAndPassword(auth, email, password);
      router.push(`/${locale}/dashboard`);
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('E-posta veya şifre hatalı.');
      } else if (code === 'auth/too-many-requests') {
        setError('Çok fazla başarısız deneme. Lütfen bekleyin.');
      } else {
        setError(err.message || 'Giriş yapılamadı.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0B0F] flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#0047FF] opacity-20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full bg-[#B000FF] opacity-20 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00F0FF] opacity-10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href={`/${locale}`}>
            <img
              src="/logo.png"
              alt="Ki Business Solutions"
              className="mx-auto h-10 w-auto"
            />
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Portale Giriş Yap</h1>
          <p className="mt-2 text-sm text-white/50">
            Danışmanlık satın aldıktan sonra gönderilen e-posta ve şifreyi kullanın.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
          {!configured ? (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
              Firebase yapılandırılmamış. Lütfen Netlify ortam değişkenlerini kontrol edin:
              <code className="mt-2 block text-xs text-yellow-200/70">
                NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID
              </code>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/70">E-posta adresi</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ornek@email.com"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-[#00F0FF]/50 focus:ring-2 focus:ring-[#00F0FF]/20"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/70">Şifre</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-[#00F0FF]/50 focus:ring-2 focus:ring-[#00F0FF]/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !authReady}
                className="w-full rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-6 py-3 font-semibold text-white shadow-lg shadow-[#0047FF]/30 transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          Hesabınız yok mu?{' '}
          <Link href={`/${locale}/marketplace`} className="text-[#00F0FF] hover:underline">Danışman Bul</Link>
        </p>
      </div>
    </div>
  );
}
