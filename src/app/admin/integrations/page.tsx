'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';

export default function ConsultantIntegrationsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [consultantId, setConsultantId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserEmail(null);
        setIsAdmin(false);
        return;
      }

      const email = user.email ?? '';
      setUserEmail(email);

      const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? 'admin@kibusiness.co')
        .split(',')
        .map((item) => item.trim().toLowerCase());

      setIsAdmin(adminEmails.includes(email.toLowerCase()));
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
    setUserEmail(null);
    setIsAdmin(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const auth = getFirebaseAuth();
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('Authentication required. Please sign in again.');
      }

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/consultant-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'update_stripe',
          consultant_id: consultantId,
          api_key: apiKey,
          webhook_secret: webhookSecret,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update consultant Stripe settings.');
      }

      setFeedback('Consultant Stripe settings saved successfully.');
      setConsultantId('');
      setApiKey('');
      setWebhookSecret('');
    } catch (error: any) {
      console.error('Integration form error:', error);
      setFeedback(error.message || 'Unable to save consultant settings.');
    } finally {
      setLoading(false);
    }
  };

  if (!userEmail) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Consultant Integrations</h1>
          <p className="mt-3 text-gray-600">Please sign in to manage consultant Stripe integration settings.</p>
          <div className="mt-6">
            <a href="/login" className="rounded-full bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">
              Sign in
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Access denied</h1>
          <p className="mt-3 text-gray-600">Your user is not authorized to manage consultant settings.</p>
          <div className="mt-6">
            <button onClick={handleLogout} className="rounded-full bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">
              Sign out
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-50 py-20">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Consultant Integrations</h1>
            <p className="mt-2 text-gray-600">Store encrypted Stripe credentials and webhook secrets per consultant.</p>
            <p className="mt-1 text-sm text-gray-500">Signed in as {userEmail}</p>
          </div>
          <div className="flex gap-3">
            <a href="/admin" className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Admin Dashboard
            </a>
            <button onClick={handleLogout} className="inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700">
              Sign out
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          {feedback && <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-800">{feedback}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Consultant UID *</label>
            <input
              type="text"
              value={consultantId}
              onChange={(event) => setConsultantId(event.target.value)}
              required
              placeholder="e.g. consultant123"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Stripe Secret Key *</label>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              required
              placeholder="sk_live_..."
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Stripe Webhook Secret *</label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              required
              placeholder="whsec_..."
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500/20"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Make sure the consultant record exists in Firestore under <code className="rounded bg-slate-100 px-1.5 py-0.5">users/&lt;uid&gt;</code>.</p>
            <Button type="submit" disabled={loading} variant="primary">
              {loading ? 'Saving …' : 'Save Stripe Integration'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
