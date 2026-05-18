'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { Button } from '@/components/ui/button';

const SECTORS = [
  'Üretim',
  'Teknoloji',
  'Finans & Bankacılık',
  'Sağlık',
  'Perakende',
  'Lojistik & Tedarik Zinciri',
  'İnşaat & Gayrimenkul',
  'Enerji',
  'Eğitim',
  'Turizm & Otelcilik',
  'Tarım',
  'Diğer',
];

const EMPLOYEE_RANGES = ['1–10', '11–50', '51–200', '201–500', '501–1000', '1000+'];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointment_id') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    company: '',
    sector: '',
    employee_count: '',
    description: '',
  });

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      router.push('/login');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email ?? '');

      await user.reload().catch(() => {});
      setEmailVerified(user.emailVerified);

      if (user.emailVerified) {
        const token = await user.getIdToken();
        const res = await fetch('/api/onboarding', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.profile) setAlreadyDone(true);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSendVerification = async () => {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (!user) return;
    try {
      await sendEmailVerification(user);
      setVerificationSent(true);
    } catch (err: any) {
      setError(err.message || 'Doğrulama emaili gönderilemedi.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      const user = auth?.currentUser;
      if (!user) throw new Error('Oturum bulunamadı.');

      await user.reload();
      if (!user.emailVerified) {
        throw new Error('Email adresinizi henüz onaylamadınız.');
      }

      const token = await user.getIdToken(true);
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, appointment_id: appointmentId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Form gönderilemedi.');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Beklenmeyen bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (loading) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <p className="text-gray-600">Yükleniyor…</p>
        </div>
      </section>
    );
  }

  if (success || alreadyDone) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {alreadyDone && !success ? 'Form daha önce doldurulmuş' : 'Form başarıyla gönderildi!'}
          </h1>
          <p className="mt-3 text-gray-600">
            Danışmanınız bilgilerinizi inceledikten sonra sizinle iletişime geçecektir.
          </p>
          <div className="mt-8">
            <Button type="button" variant="primary" onClick={() => router.push('/dashboard')}>
              Portale Git
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (!emailVerified) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Email Doğrulaması Gerekli</h1>
          <p className="mt-3 text-gray-600">
            Başlangıç formunu doldurmak için önce{' '}
            <span className="font-medium text-primary-600">{userEmail}</span> adresini doğrulamanız gerekmektedir.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Ödeme onayı emailindeki "Hesabı Aktifleştir" bağlantısını kullanabilir ya da aşağıdan yeni bir doğrulama emaili isteyebilirsiniz.
          </p>
          {verificationSent ? (
            <p className="mt-6 rounded-2xl bg-green-50 p-4 text-sm text-green-700">
              Doğrulama emaili gönderildi. Lütfen gelen kutunuzu kontrol edin.
            </p>
          ) : (
            <div className="mt-6">
              <Button type="button" variant="primary" onClick={handleSendVerification}>
                Doğrulama Emaili Gönder
              </Button>
            </div>
          )}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <p className="mt-6 text-sm text-gray-500">
            Email doğrulandıktan sonra bu sayfayı yenileyin.{' '}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-primary-600 underline hover:text-primary-800"
            >
              Sayfayı Yenile
            </button>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-50 py-20">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Başlangıç Formu</h1>
          <p className="mt-2 text-gray-600">
            Danışmanınızın sizi daha iyi tanıyabilmesi için lütfen aşağıdaki bilgileri doldurun.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  Ad *
                </label>
                <input
                  id="first_name"
                  type="text"
                  value={form.first_name}
                  onChange={set('first_name')}
                  required
                  placeholder="Adınız"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  Soyad *
                </label>
                <input
                  id="last_name"
                  type="text"
                  value={form.last_name}
                  onChange={set('last_name')}
                  required
                  placeholder="Soyadınız"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                Şirket / Kuruluş Adı *
              </label>
              <input
                id="company"
                type="text"
                value={form.company}
                onChange={set('company')}
                required
                placeholder="Şirket adı"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sector" className="block text-sm font-medium text-gray-700">
                  Sektör *
                </label>
                <select
                  id="sector"
                  value={form.sector}
                  onChange={set('sector')}
                  required
                  title="Sektör"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  <option value="">Seçin…</option>
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="employee_count" className="block text-sm font-medium text-gray-700">
                  Çalışan Sayısı *
                </label>
                <select
                  id="employee_count"
                  value={form.employee_count}
                  onChange={set('employee_count')}
                  required
                  title="Çalışan sayısı"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  <option value="">Seçin…</option>
                  {EMPLOYEE_RANGES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Bize Kendinizden Bahsedin
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={set('description')}
                rows={4}
                placeholder="Danışmanlık almak istediğiniz konu, mevcut durum veya hedefleriniz hakkında kısaca bilgi verebilirsiniz."
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? 'Gönderiliyor…' : 'Formu Gönder'}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
