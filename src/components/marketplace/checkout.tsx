'use client';

import { useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';

interface MarketplaceCheckoutProps {
  consultantId: string;
  packageId: string;
  onSuccess?: (appointmentId: string, sessionId: string) => void;
}

export function MarketplaceCheckout({
  consultantId,
  packageId,
  onSuccess,
}: MarketplaceCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentTimezone, setAppointmentTimezone] = useState('America/New_York');
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  // Initialize Stripe
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (publishableKey && !stripePromise) {
    setStripePromise(loadStripe(publishableKey));
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!customerEmail || !appointmentDate || !appointmentTime) {
        throw new Error('Please fill in all required fields');
      }

      // Create checkout session
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { sessionId, appointmentId } = await response.json();

      // Redirect to Stripe checkout
      if (!stripePromise) {
        throw new Error('Stripe is not configured');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Unable to load Stripe');
      }

      const result = await stripe.redirectToCheckout({ sessionId });
      if (result.error) {
        throw new Error(result.error.message || 'Stripe redirect failed');
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(appointmentId, sessionId);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCheckout} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Book Your Consultation</h2>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium mb-1">Email Address *</label>
        <input
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Full Name</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Your Name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Preferred Date *</label>
        <input
          type="date"
          value={appointmentDate}
          onChange={(e) => setAppointmentDate(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Preferred Time *</label>
        <input
          type="time"
          value={appointmentTime}
          onChange={(e) => setAppointmentTime(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Timezone</label>
        <select
          value={appointmentTimezone}
          onChange={(e) => setAppointmentTimezone(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md"
      >
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        Secure payment powered by Stripe
      </p>
    </form>
  );
}
