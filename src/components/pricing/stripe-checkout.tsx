'use client';

import { useEffect, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { PublicConsultantInfo } from '@/types/marketplace';

interface CheckoutButtonProps {
  packageId: string;
  packageName: string;
}

export function CheckoutButton({ packageId, packageName }: CheckoutButtonProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consultants, setConsultants] = useState<PublicConsultantInfo[]>([]);
  const [consultantsLoading, setConsultantsLoading] = useState(false);
  const [selectedConsultantId, setSelectedConsultantId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentTimezone, setAppointmentTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (publishableKey) {
      setStripePromise(loadStripe(publishableKey));
    }
  }, []);

  useEffect(() => {
    if (!formOpen) return;
    setConsultantsLoading(true);
    fetch('/api/consultants')
      .then((r) => r.json())
      .then((data) => {
        setConsultants(data.consultants || []);
        if (data.consultants?.length === 1) {
          setSelectedConsultantId(data.consultants[0].uid);
        }
      })
      .catch(() => setConsultants([]))
      .finally(() => setConsultantsLoading(false));
  }, [formOpen]);

  const handleCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!customerEmail || !appointmentDate || !appointmentTime || !selectedConsultantId) {
      setError('Lütfen danışman seçin, email, tarih ve saati doldurun.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId: selectedConsultantId,
          packageId,
          customerEmail,
          customerName,
          appointmentDate,
          appointmentTime,
          appointmentTimezone,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Checkout oturumu oluşturulamadı.');
      }

      if (!data.sessionId) {
        throw new Error('Stripe oturumu oluşturulamadı.');
      }

      if (!stripePromise) {
        throw new Error('Stripe yapılandırılmamış.');
      }

      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe yüklenemedi.');

      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (result.error) throw new Error(result.error.message || 'Stripe yönlendirmesi başarısız.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (!formOpen) {
    return (
      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className="mt-8 w-full rounded-full bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700"
      >
        {packageName} Paketi Rezerve Et
      </button>
    );
  }

  const selectedConsultant = consultants.find((c) => c.uid === selectedConsultantId);

  return (
    <form
      onSubmit={handleCheckout}
      className="mt-6 space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Randevu Bilgileri</h4>
        <button
          type="button"
          onClick={() => setFormOpen(false)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Danışman Seçin *</label>
        {consultantsLoading ? (
          <p className="mt-2 text-sm text-gray-500">Danışmanlar yükleniyor…</p>
        ) : consultants.length === 0 ? (
          <p className="mt-2 text-sm text-red-600">
            Şu an randevu alabileceğiniz danışman bulunmamaktadır.
          </p>
        ) : (
          <div className="mt-2 grid gap-2">
            {consultants.map((c) => (
              <button
                key={c.uid}
                type="button"
                onClick={() => setSelectedConsultantId(c.uid)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                  selectedConsultantId === c.uid
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {c.photo_url ? (
                  <img
                    src={c.photo_url}
                    alt={c.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {c.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{c.name}</p>
                  {c.title && (
                    <p className="truncate text-xs text-gray-500">{c.title}</p>
                  )}
                  {c.expertise && (
                    <p className="mt-0.5 truncate text-xs text-primary-600">{c.expertise}</p>
                  )}
                </div>
                {selectedConsultantId === c.uid && (
                  <span className="text-primary-600">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email *</label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            required
            placeholder="email@adresiniz.com"
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Adınız Soyadınız"
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`date-${packageId}`} className="block text-sm font-medium text-gray-700">
            Tarih *
          </label>
          <input
            id={`date-${packageId}`}
            type="date"
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
            title="Randevu tarihi"
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div>
          <label htmlFor={`time-${packageId}`} className="block text-sm font-medium text-gray-700">
            Saat *
          </label>
          <input
            id={`time-${packageId}`}
            type="time"
            value={appointmentTime}
            onChange={(e) => setAppointmentTime(e.target.value)}
            required
            title="Randevu saati"
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`tz-${packageId}`} className="block text-sm font-medium text-gray-700">
          Saat Dilimi
        </label>
        <select
          id={`tz-${packageId}`}
          value={appointmentTimezone}
          onChange={(e) => setAppointmentTimezone(e.target.value)}
          title="Saat dilimi"
          className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="Europe/Istanbul">İstanbul (TRT)</option>
          <option value="America/New_York">New York (ET)</option>
          <option value="America/Chicago">Chicago (CT)</option>
          <option value="America/Denver">Denver (MT)</option>
          <option value="America/Los_Angeles">Los Angeles (PT)</option>
          <option value="Europe/London">Londra (GMT)</option>
          <option value="Europe/Paris">Paris (CET)</option>
          <option value="Asia/Dubai">Dubai (GST)</option>
          <option value="Asia/Tokyo">Tokyo (JST)</option>
          <option value="Australia/Sydney">Sydney (AEST)</option>
          <option value="UTC">UTC</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        disabled={loading || !selectedConsultantId || consultants.length === 0}
        className="w-full"
      >
        {loading
          ? 'İşleniyor…'
          : selectedConsultant
          ? `${selectedConsultant.name} ile Rezerve Et`
          : `${packageName} Paketi Öde`}
      </Button>
    </form>
  );
}
