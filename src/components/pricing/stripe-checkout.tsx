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

  useEffect(() => {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (publishableKey) {
      setStripePromise(loadStripe(publishableKey));
    }
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId }),
      });

      const data = await response.json();

      if (!data.sessionId) {
        setError(data.error || 'Unable to create checkout session.');
        setLoading(false);
        return;
      }

      if (!stripePromise) {
        setError('Stripe is not configured. Provide NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.');
        setLoading(false);
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        setError('Unable to load Stripe.');
        setLoading(false);
        return;
      }

      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (result.error) {
        setError(result.error.message || 'Stripe redirect failed.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unexpected error while redirecting to checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <Button type="button" variant="primary" className="w-full" onClick={handleCheckout} disabled={loading}>
        {loading ? 'Redirecting...' : `Book ${packageName}`}
      </Button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
