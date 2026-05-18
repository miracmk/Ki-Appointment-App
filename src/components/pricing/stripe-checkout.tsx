'use client';

import { useEffect, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';

interface CheckoutButtonProps {
  packageId: string;
  packageName: string;
}

export function CheckoutButton({ packageId, packageName }: CheckoutButtonProps) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentTimezone, setAppointmentTimezone] = useState('America/New_York');
  const [consultantId, setConsultantId] = useState(process.env.NEXT_PUBLIC_DEFAULT_CONSULTANT_ID || '');

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (publishableKey) {
      setStripePromise(loadStripe(publishableKey));
    }
  }, []);

  const handleCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!customerEmail || !appointmentDate || !appointmentTime || !consultantId) {
      setError('Please complete your email, consultant ID, date, and time before booking.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consultantId,
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
        throw new Error(data.error || 'Failed to create checkout session.');
      }

      if (!data.sessionId) {
        throw new Error(data.error || 'Stripe session could not be created.');
      }

      if (!stripePromise) {
        throw new Error('Stripe is not configured. Missing publishable key.');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Unable to load Stripe.');
      }

      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (result.error) {
        throw new Error(result.error.message || 'Stripe redirect failed.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unexpected error while redirecting to checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCheckout} className="space-y-4 mt-6 p-6 bg-white rounded-3xl border border-gray-200 shadow-sm">
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email address *</label>
          <input
            type="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
            required
            placeholder="your@email.com"
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Full name</label>
          <input
            type="text"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Your name"
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label htmlFor="consultant-id" className="block text-sm font-medium text-gray-700">Consultant ID *</label>
          <input
            id="consultant-id"
            type="text"
            value={consultantId}
            onChange={(event) => setConsultantId(event.target.value)}
            required
            placeholder="Consultant UID"
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <p className="mt-1 text-xs text-gray-500">Enter the consultant UID configured by your admin or leave default if assigned.</p>
        </div>

        <div>
          <label htmlFor="appointment-date" className="block text-sm font-medium text-gray-700">Preferred date *</label>
          <input
            id="appointment-date"
            type="date"
            value={appointmentDate}
            onChange={(event) => setAppointmentDate(event.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label htmlFor="appointment-time" className="block text-sm font-medium text-gray-700">Preferred time *</label>
          <input
            id="appointment-time"
            type="time"
            value={appointmentTime}
            onChange={(event) => setAppointmentTime(event.target.value)}
            required
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label htmlFor="appointment-timezone" className="block text-sm font-medium text-gray-700">Timezone</label>
          <select
            id="appointment-timezone"
            value={appointmentTimezone}
            onChange={(event) => setAppointmentTimezone(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Dubai">Dubai (GST)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Australia/Sydney">Sydney (AEST)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Processing...' : `Book ${packageName}`}
        </Button>
      </div>
    </form>
  );
}
