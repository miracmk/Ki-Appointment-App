'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { FlatAppointment } from '@/types/marketplace';

interface DocumentItem {
  id: string;
  title: string;
  url: string;
  packageId: string;
}

const statusLabels: Record<string, { label: string; style: string }> = {
  confirmed: { label: 'Onaylandı', style: 'bg-green-100 text-green-800' },
  pending: { label: 'Beklemede', style: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: 'İptal', style: 'bg-red-100 text-red-800' },
  completed: { label: 'Tamamlandı', style: 'bg-blue-100 text-blue-800' },
};

const onboardingLabels: Record<string, { label: string; style: string }> = {
  form_pending: { label: 'Başlangıç formu bekleniyor', style: 'bg-orange-100 text-orange-700' },
  complete: { label: 'Onboarding tamamlandı', style: 'bg-green-100 text-green-700' },
};

function formatAppointmentDate(isoDate: string, time: string, timezone: string): string {
  try {
    const dt = new Date(isoDate);
    const datePart = dt.toLocaleDateString('tr-TR', {
      timeZone: timezone || 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `${datePart}, ${time} (${timezone || 'UTC'})`;
  } catch {
    return `${isoDate} ${time}`;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<(FlatAppointment & { id: string })[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email);
      const db = getFirestoreClient();
      if (!db) {
        setLoading(false);
        return;
      }

      const email = user.email ?? '';

      const [appointmentsSnap, docsSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'appointments'),
            where('customer_email', '==', email)
          )
        ),
        getDocs(
          query(
            collection(db, 'userDocuments'),
            where('userEmail', '==', email)
          )
        ),
      ]);

      const appts = appointmentsSnap.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<FlatAppointment, 'id'>) }))
        .sort((a, b) => b.created_at - a.created_at);

      setAppointments(appts);
      setDocuments(
        docsSnap.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          url: doc.data().url,
          packageId: doc.data().packageId,
        }))
      );

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <p className="text-gray-700">Portal yükleniyor…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Müşteri Portalı</h1>
            <p className="mt-2 text-gray-600">
              Hoş geldiniz{userEmail ? `, ${userEmail}` : ''}. Randevularınızı ve belgelerinizi buradan takip edebilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Ana Sayfa
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700"
            >
              Çıkış Yap
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">Randevularım</h2>
            {appointments.length === 0 ? (
              <p className="mt-4 text-gray-600">
                Henüz randevunuz bulunmuyor. Ana sayfadan bir paket seçerek rezervasyon yapabilirsiniz.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {appointments.map((appt) => {
                  const statusInfo = statusLabels[appt.status] ?? {
                    label: appt.status,
                    style: 'bg-gray-100 text-gray-800',
                  };
                  const onboardingInfo = onboardingLabels[appt.onboarding_status];
                  return (
                    <div key={appt.id} className="rounded-3xl border border-gray-200 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900">{appt.package_name}</h3>
                          {appt.consultant_name && (
                            <p className="mt-0.5 text-sm text-gray-500">
                              Danışman: {appt.consultant_name}
                            </p>
                          )}
                          <p className="mt-1 text-sm text-gray-600">
                            {formatAppointmentDate(
                              appt.appointment_date,
                              appt.appointment_time,
                              appt.appointment_timezone
                            )}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            Ödeme: ${(appt.payment_amount / 100).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.style}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      {onboardingInfo && appt.onboarding_status === 'form_pending' && (
                        <div className="mt-3 flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-2">
                          <span className={`text-xs font-medium ${onboardingInfo.style}`}>
                            {onboardingInfo.label}
                          </span>
                          <Link
                            href="/onboarding"
                            className="text-xs font-semibold text-orange-700 underline hover:text-orange-900"
                          >
                            Formu Doldur →
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">Belgelerim</h2>
            {documents.length === 0 ? (
              <p className="mt-4 text-gray-600">
                Belgeleriniz danışmanlık onaylandıktan sonra burada görünecektir.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="rounded-3xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                        <p className="text-sm text-gray-500">Paket: {doc.packageId}</p>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                      >
                        İndir
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
