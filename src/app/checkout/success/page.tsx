'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getFirestoreClient } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';
import { FlatAppointment } from '@/types/marketplace';

function formatDate(isoDate: string, time: string, timezone: string): string {
  try {
    const dt = new Date(isoDate);
    return (
      dt.toLocaleDateString('tr-TR', {
        timeZone: timezone || 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) +
      ', ' +
      time +
      ' (' +
      (timezone || 'UTC') +
      ')'
    );
  } catch {
    return `${isoDate} ${time}`;
  }
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointment_id');
  const [appointment, setAppointment] = useState<(FlatAppointment & { id: string }) | null>(null);
  const [loadingAppt, setLoadingAppt] = useState(!!appointmentId);

  useEffect(() => {
    if (!appointmentId) return;
    const db = getFirestoreClient();
    if (!db) { setLoadingAppt(false); return; }

    getDoc(doc(db, 'appointments', appointmentId))
      .then((snap) => {
        if (snap.exists()) {
          setAppointment({ id: snap.id, ...(snap.data() as Omit<FlatAppointment, 'id'>) });
        }
      })
      .catch(console.error)
      .finally(() => setLoadingAppt(false));
  }, [appointmentId]);

  return (
    <section className="min-h-screen bg-gray-50 py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-center text-3xl font-bold text-gray-900">Ödeme Başarılı!</h1>
          <p className="mt-3 text-center text-gray-600">
            Randevunuz alındı. Onay ve giriş bilgileriniz email adresinize gönderilmiştir.
          </p>

          {/* Appointment details */}
          {loadingAppt ? (
            <div className="mt-8 rounded-2xl bg-gray-50 p-5 text-center text-sm text-gray-500">
              Randevu bilgileri yükleniyor…
            </div>
          ) : appointment ? (
            <div className="mt-8 rounded-2xl bg-primary-50 p-6">
              <h2 className="font-semibold text-primary-900">Randevu Özeti</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Paket</dt>
                  <dd className="font-medium text-gray-900 text-right">{appointment.package_name}</dd>
                </div>
                {appointment.consultant_name && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-gray-500">Danışman</dt>
                    <dd className="font-medium text-gray-900 text-right">{appointment.consultant_name}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Tarih & Saat</dt>
                  <dd className="font-medium text-gray-900 text-right">
                    {formatDate(
                      appointment.appointment_date,
                      appointment.appointment_time,
                      appointment.appointment_timezone
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Ödeme</dt>
                  <dd className="font-medium text-gray-900">${(appointment.payment_amount / 100).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          {/* Next steps */}
          <div className="mt-8 space-y-3 text-sm text-gray-600">
            <p className="font-medium text-gray-900">Sonraki adımlar:</p>
            <ol className="list-inside list-decimal space-y-2 pl-1">
              <li>Email gelen kutunuzu kontrol edin ve hesabınızı aktifleştirin.</li>
              <li>Email doğrulandıktan sonra başlangıç formunu doldurun.</li>
              <li>Danışmanınız form bilgilerinizi inceleyerek sizinle iletişime geçecektir.</li>
            </ol>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-700"
            >
              Başlangıç Formunu Doldur
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Portale Giriş Yap
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
