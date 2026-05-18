'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { FlatAppointment } from '@/types/marketplace';

const paymentModeLabels: Record<string, string> = {
  ki_escrow: 'Escrow',
  own_keys: 'Kendi Key',
  ki_connect: 'Connect',
  direct: 'Direkt',
};

interface DocumentItem {
  id: string;
  title: string;
  url: string;
  packageId: string;
  userEmail: string;
}

const statusLabels: Record<string, { label: string; style: string }> = {
  confirmed: { label: 'Onaylandı', style: 'bg-green-100 text-green-800' },
  pending: { label: 'Beklemede', style: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: 'İptal', style: 'bg-red-100 text-red-800' },
  completed: { label: 'Tamamlandı', style: 'bg-blue-100 text-blue-800' },
};

const onboardingLabels: Record<string, { label: string; style: string }> = {
  form_pending: { label: 'Form Bekleniyor', style: 'bg-orange-100 text-orange-700' },
  complete: { label: 'Tamamlandı', style: 'bg-green-100 text-green-700' },
};

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [appointments, setAppointments] = useState<(FlatAppointment & { id: string })[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docPackage, setDocPackage] = useState('starter');
  const [docEmail, setDocEmail] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [payoutLoading, setPayoutLoading] = useState<string | null>(null);
  const [payoutFeedback, setPayoutFeedback] = useState<{ id: string; message: string; ok: boolean } | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setUserEmail(null); setLoading(false); return; }

      const email = user.email ?? '';
      setUserEmail(email);

      const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? 'admin@kibusiness.co')
        .split(',')
        .map((e) => e.trim().toLowerCase());

      const currentIsAdmin = adminEmails.includes(email.toLowerCase());
      setIsAdmin(currentIsAdmin);
      if (!currentIsAdmin) { setLoading(false); return; }

      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }

      const [apptSnap, docsSnap] = await Promise.all([
        getDocs(query(collection(db, 'appointments'), orderBy('created_at', 'desc'))),
        getDocs(query(collection(db, 'userDocuments'), orderBy('createdAt', 'desc'))),
      ]);

      setAppointments(
        apptSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<FlatAppointment, 'id'>) }))
      );
      setDocuments(
        docsSnap.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          url: doc.data().url,
          packageId: doc.data().packageId,
          userEmail: doc.data().userEmail || '',
        }))
      );

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
    setIsAdmin(false);
    setUserEmail(null);
  };

  const handlePayout = async (appointmentId: string) => {
    setPayoutLoading(appointmentId);
    setPayoutFeedback(null);
    try {
      const auth = getFirebaseAuth();
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error('Oturum bulunamadı.');
      const res = await fetch('/api/admin/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ appointment_id: appointmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ödeme başarısız.');
      setPayoutFeedback({ id: appointmentId, message: `Ödeme yapıldı. Transfer: ${data.transfer_id}`, ok: true });
      // Refresh payout_status in local state
      setAppointments((prev) =>
        prev.map((a) => a.id === appointmentId ? { ...a, payout_status: 'paid', stripe_transfer_id: data.transfer_id } : a)
      );
    } catch (err: any) {
      setPayoutFeedback({ id: appointmentId, message: err.message || 'Hata oluştu.', ok: false });
    } finally {
      setPayoutLoading(null);
    }
  };

  const handleAddDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const db = getFirestoreClient();
    if (!db) { setFeedback('Veritabanına erişilemiyor.'); return; }
    try {
      await addDoc(collection(db, 'userDocuments'), {
        title: docTitle,
        url: docUrl,
        packageId: docPackage,
        userEmail: docEmail,
        createdAt: new Date().toISOString(),
      });
      setFeedback('Belge başarıyla atandı.');
      setDocTitle(''); setDocUrl(''); setDocEmail('');
    } catch {
      setFeedback('Belge eklenemedi.');
    }
  };

  const filteredAppointments = filterStatus === 'all'
    ? appointments
    : filterStatus === 'onboarding_pending'
    ? appointments.filter((a) => a.onboarding_status === 'form_pending')
    : appointments.filter((a) => a.status === filterStatus);

  if (loading) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <p className="text-gray-700">Admin paneli yükleniyor…</p>
        </div>
      </section>
    );
  }

  if (!userEmail) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Admin Paneli</h1>
          <p className="mt-3 text-gray-600">Erişmek için giriş yapın.</p>
          <div className="mt-6">
            <Link href="/login" className="rounded-full bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">
              Giriş Yap
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Erişim Reddedildi</h1>
          <p className="mt-3 text-gray-600">Bu hesap admin olarak tanımlı değil.</p>
          <div className="mt-6">
            <button type="button" onClick={handleLogout} className="rounded-full bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">
              Çıkış Yap
            </button>
          </div>
        </div>
      </section>
    );
  }

  const statsMap = {
    total: appointments.length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    onboardingPending: appointments.filter((a) => a.onboarding_status === 'form_pending').length,
    onboardingDone: appointments.filter((a) => a.onboarding_status === 'complete').length,
  };

  return (
    <section className="min-h-screen bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Paneli</h1>
            <p className="mt-1 text-sm text-gray-500">Giriş: {userEmail}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/integrations" className="inline-flex items-center justify-center rounded-full border border-primary-300 bg-primary-50 px-5 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-100">
              Entegrasyonlar
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Müşteri Portalı
            </Link>
            <button type="button" onClick={handleLogout} className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
              Çıkış Yap
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Toplam Randevu', value: statsMap.total, style: 'text-gray-900' },
            { label: 'Onaylanan', value: statsMap.confirmed, style: 'text-green-700' },
            { label: 'Form Bekleyen', value: statsMap.onboardingPending, style: 'text-orange-600' },
            { label: 'Onboarding Tamam', value: statsMap.onboardingDone, style: 'text-blue-700' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-3xl bg-white p-6 shadow-sm text-center">
              <p className={`text-3xl font-bold ${stat.style}`}>{stat.value}</p>
              <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.4fr_0.6fr]">
          {/* Appointments */}
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-gray-900">Randevular</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Tümü' },
                  { value: 'confirmed', label: 'Onaylı' },
                  { value: 'pending', label: 'Bekleyen' },
                  { value: 'onboarding_pending', label: 'Form Bekleniyor' },
                ].map((f) => (
                  <button
                    type="button"
                    key={f.value}
                    onClick={() => setFilterStatus(f.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      filterStatus === f.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <p className="mt-4 text-gray-600">Bu filtreye ait randevu bulunamadı.</p>
            ) : (
              <div className="mt-2 space-y-4">
                {filteredAppointments.map((appt) => {
                  const statusInfo = statusLabels[appt.status] ?? { label: appt.status, style: 'bg-gray-100 text-gray-800' };
                  const obInfo = onboardingLabels[appt.onboarding_status];
                  const isEscrowPending = appt.payment_mode === 'ki_escrow' && appt.payout_status === 'pending';
                  const isEscrowPaid = appt.payment_mode === 'ki_escrow' && appt.payout_status === 'paid';
                  return (
                    <div key={appt.id} className="rounded-3xl border border-gray-200 p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-primary-700">{appt.customer_email}</p>
                          {appt.customer_name && (
                            <p className="text-sm text-gray-500">{appt.customer_name}</p>
                          )}
                          <h3 className="mt-1 font-semibold text-gray-900">{appt.package_name}</h3>
                          {appt.consultant_name && (
                            <p className="text-xs text-gray-500">Danışman: {appt.consultant_name}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(appt.created_at).toLocaleString('tr-TR')}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.style}`}>
                            {statusInfo.label}
                          </span>
                          {obInfo && (
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${obInfo.style}`}>
                              {obInfo.label}
                            </span>
                          )}
                          {appt.payment_mode && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                              {paymentModeLabels[appt.payment_mode] ?? appt.payment_mode}
                            </span>
                          )}
                          {isEscrowPaid && (
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                              Ödendi
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        ${(appt.payment_amount / 100).toLocaleString()} · {appt.appointment_time} ·{' '}
                        {new Date(appt.appointment_date).toLocaleDateString('tr-TR', { timeZone: appt.appointment_timezone })}
                      </p>
                      {appt.platform_fee_cents != null && (
                        <p className="mt-1 text-xs text-gray-400">
                          Platform komisyonu: ${(appt.platform_fee_cents / 100).toFixed(2)} · Danışman payı: ${((appt.consultant_payout_cents ?? 0) / 100).toFixed(2)}
                        </p>
                      )}
                      {isEscrowPending && (
                        <div className="mt-3">
                          <button
                            type="button"
                            disabled={payoutLoading === appt.id}
                            onClick={() => handlePayout(appt.id)}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {payoutLoading === appt.id ? 'İşleniyor…' : 'Danışmana Öde'}
                          </button>
                        </div>
                      )}
                      {payoutFeedback?.id === appt.id && (
                        <p className={`mt-2 text-xs ${payoutFeedback.ok ? 'text-green-700' : 'text-red-600'}`}>
                          {payoutFeedback.message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assign Document */}
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">PDF Belgesi Ata</h2>
            <form onSubmit={handleAddDocument} className="mt-6 space-y-4">
              <div>
                <label htmlFor="doc-email" className="block text-sm font-medium text-gray-700">
                  Müşteri Email
                </label>
                <input
                  id="doc-email"
                  value={docEmail}
                  onChange={(e) => setDocEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="musteri@email.com"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div>
                <label htmlFor="doc-title" className="block text-sm font-medium text-gray-700">
                  Belge Başlığı
                </label>
                <input
                  id="doc-title"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  type="text"
                  required
                  placeholder="Rapor Başlığı"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div>
                <label htmlFor="doc-url" className="block text-sm font-medium text-gray-700">
                  Belge URL
                </label>
                <input
                  id="doc-url"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  type="url"
                  required
                  placeholder="https://..."
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div>
                <label htmlFor="doc-package" className="block text-sm font-medium text-gray-700">
                  Paket
                </label>
                <select
                  id="doc-package"
                  value={docPackage}
                  onChange={(e) => setDocPackage(e.target.value)}
                  title="Paket seçimi"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="scale">Scale</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
              <Button type="submit" variant="primary" className="w-full">
                Belge Ata
              </Button>
            </form>
            {feedback && (
              <p className={`mt-4 text-sm ${feedback.includes('başarıyla') ? 'text-green-700' : 'text-red-600'}`}>
                {feedback}
              </p>
            )}
          </div>
        </div>

        {/* Shared Documents */}
        <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900">Atanmış Belgeler</h2>
          {documents.length === 0 ? (
            <p className="mt-4 text-gray-600">Henüz belge atanmamış.</p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <div key={doc.id} className="rounded-3xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-gray-900">{doc.title}</h3>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {doc.userEmail || 'Genel'} · {doc.packageId}
                      </p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                    >
                      Görüntüle
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
