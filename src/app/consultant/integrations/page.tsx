'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { ConsultantProfile } from '@/types/marketplace';

export default function IntegrationsPage() {
  const [profile, setProfile]   = useState<ConsultantProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [apiKey, setApiKey]     = useState('');
  const [webhook, setWebhook]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const d = await getDoc(doc(db, 'users', user.uid));
      if (d.exists()) setProfile(d.data() as ConsultantProfile);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleStripeUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/consultant-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultantId: profile.uid, stripeApiKey: apiKey, stripeWebhookSecret: webhook }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error');
      setMsg({ type: 'ok', text: 'Stripe settings saved successfully.' });
      setApiKey('');
      setWebhook('');
    } catch (err: unknown) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'An error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B000FF] border-t-transparent" />
      </div>
    );
  }

  const calendarConnected = profile?.calendar_integration?.connected ?? false;
  const outlookConnected  = profile?.outlook_calendar?.connected ?? false;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Integrations</h1>

      {/* Stripe */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Stripe</h2>
          <span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${profile?.stripe_settings?.is_active ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-white/10 bg-white/5 text-white/40'}`}>
            {profile?.stripe_settings?.is_active ? 'Connected' : 'Not Connected'}
          </span>
        </div>
        <p className="text-sm text-white/40">Connect your own Stripe account (Mode B — Own API Keys).</p>
        <form onSubmit={handleStripeUpdate} className="space-y-3">
          <div>
            <label htmlFor="stripe-key" className="mb-1.5 block text-sm text-white/60">Stripe Secret Key</label>
            <input id="stripe-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk_live_..." className="input-dark w-full font-mono text-sm" autoComplete="off" />
          </div>
          <div>
            <label htmlFor="stripe-webhook" className="mb-1.5 block text-sm text-white/60">Webhook Secret</label>
            <input id="stripe-webhook" type="password" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="whsec_..." className="input-dark w-full font-mono text-sm" autoComplete="off" />
          </div>
          {msg && <p className={`text-sm ${msg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
          <button type="submit" disabled={saving || !apiKey || !webhook} className="rounded-xl bg-gradient-to-r from-[#B000FF] to-[#0047FF] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Stripe Settings'}
          </button>
        </form>
      </div>

      {/* Calendar Integration */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-[#00F0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="font-semibold text-white">Calendar Integration</h2>
          </div>
          <span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${calendarConnected ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-white/10 bg-white/5 text-white/40'}`}>
            {calendarConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
        <p className="mt-2 text-sm text-white/40">Appointments are automatically synced to your calendar.</p>
        <a
          href="/api/auth/google-calendar"
          className="mt-4 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          {calendarConnected ? 'Reconnect Calendar' : 'Connect Calendar'}
        </a>
      </div>

      {/* Outlook */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#0078D4]" fill="currentColor">
              <path d="M7.5 5.25h9A2.25 2.25 0 0118.75 7.5v9a2.25 2.25 0 01-2.25 2.25h-9A2.25 2.25 0 015.25 16.5v-9A2.25 2.25 0 017.5 5.25zm4.5 2.25a3 3 0 100 6 3 3 0 000-6z" />
            </svg>
            <h2 className="font-semibold text-white">Outlook Calendar</h2>
          </div>
          <span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${outlookConnected ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-white/10 bg-white/5 text-white/40'}`}>
            {outlookConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
        <p className="mt-2 text-sm text-white/40">Microsoft Outlook calendar integration for appointment sync.</p>
        <a
          href="/api/auth/outlook-calendar"
          className="mt-4 inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          {outlookConnected ? 'Reconnect Outlook' : 'Connect Outlook'}
        </a>
      </div>
    </div>
  );
}
