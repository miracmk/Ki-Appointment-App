'use client';

import { useEffect, useState } from 'react';
import { getFirestoreClient } from '@/lib/firebase-client';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type Tab = 'platform' | 'stripe' | 'calendar' | 'firebase';

interface PlatformSettings {
  // Platform
  platformName: string;
  platformEmail: string;
  supportEmail: string;
  platformFeeBps: number;
  appUrl: string;
  // Stripe
  stripePublicKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripeConnectClientId: string;
  // Calendar OAuth
  calendarClientId: string;
  calendarClientSecret: string;
  calendarRedirectUri: string;
  // Firebase
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
}

const DEFAULTS: PlatformSettings = {
  platformName: 'Ki Business',
  platformEmail: 'consultation@kibusiness.co',
  supportEmail: 'consultation@kibusiness.co',
  platformFeeBps: 1000,
  appUrl: '',
  stripePublicKey: '',
  stripeSecretKey: '',
  stripeWebhookSecret: '',
  stripeConnectClientId: '',
  calendarClientId: '',
  calendarClientSecret: '',
  calendarRedirectUri: '',
  firebaseApiKey: '',
  firebaseAuthDomain: '',
  firebaseProjectId: '',
  firebaseStorageBucket: '',
  firebaseMessagingSenderId: '',
  firebaseAppId: '',
};

const INP = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-red-400/60 focus:outline-none transition';
const LBL = 'mb-1.5 block text-xs font-medium text-white/50';

interface FieldDef {
  key: keyof PlatformSettings;
  label: string;
  type?: string;
  placeholder?: string;
  hint?: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);
  const [tab,      setTab]      = useState<Tab>('platform');
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [message,  setMessage]  = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [revealed, setRevealed] = useState<Partial<Record<keyof PlatformSettings, boolean>>>({});

  useEffect(() => {
    (async () => {
      try {
        const db = getFirestoreClient();
        if (!db) return;
        const snap = await getDoc(doc(db, 'platform_settings', 'config'));
        if (snap.exists()) setSettings((prev) => ({ ...prev, ...snap.data() }));
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (key: keyof PlatformSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setSettings((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore not available');
      await setDoc(doc(db, 'platform_settings', 'config'), { ...settings, updatedAt: Date.now() });
      setMessage({ type: 'ok', text: 'Settings saved.' });
    } catch (err) {
      setMessage({ type: 'err', text: String(err) });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof PlatformSettings) =>
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));

  const SecretField = ({ field, label, placeholder }: { field: keyof PlatformSettings; label: string; placeholder?: string }) => (
    <div>
      <label className={LBL}>{label}</label>
      <div className="relative">
        <input
          type={revealed[field] ? 'text' : 'password'}
          value={settings[field] as string}
          onChange={set(field)}
          placeholder={placeholder}
          className={INP + ' pr-16'}
        />
        <button
          type="button"
          onClick={() => toggle(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 hover:text-white/60"
        >
          {revealed[field] ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'platform', label: 'Platform',  icon: '⚙️' },
    { id: 'stripe',   label: 'Stripe',    icon: '💳' },
    { id: 'calendar', label: 'Calendar',  icon: '📅' },
    { id: 'firebase', label: 'Firebase',  icon: '🔥' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="mt-1 text-sm text-white/40">Master configuration — saved to <code className="text-white/30">platform_settings/config</code> in Firestore</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-white/[0.06]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition border-b-2 ${
              tab === t.id
                ? 'border-red-400 text-red-400'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-5 rounded-xl p-3.5 text-sm ${message.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* ── Platform ─────────────────────────────────────── */}
        {tab === 'platform' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Identity</h2>
              <div>
                <label className={LBL}>Platform Name</label>
                <input type="text" value={settings.platformName} onChange={set('platformName')} className={INP} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ps-platform-email" className={LBL}>Platform Email</label>
                  <input id="ps-platform-email" type="email" value={settings.platformEmail} onChange={set('platformEmail')} className={INP} />
                </div>
                <div>
                  <label htmlFor="ps-support-email" className={LBL}>Support Email</label>
                  <input id="ps-support-email" type="email" value={settings.supportEmail} onChange={set('supportEmail')} className={INP} />
                </div>
              </div>
              <div>
                <label className={LBL}>App URL</label>
                <input type="url" value={settings.appUrl} onChange={set('appUrl')} placeholder="https://ki-appointment.netlify.app" className={INP} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Fee Structure</h2>
              <div>
                <label className={LBL}>
                  Platform Fee — <span className="text-white/30">currently {settings.platformFeeBps / 100}%</span>
                </label>
                <input
                  type="number" min={0} max={5000} step={50}
                  value={settings.platformFeeBps} onChange={set('platformFeeBps')}
                  className={INP}
                />
                <p className="mt-1.5 text-xs text-white/25">Basis points: 1000 = 10%, 500 = 5%, 250 = 2.5%</p>
              </div>
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3 text-xs text-white/40 space-y-1">
                <p>Fee applies to <strong className="text-white/60">Condition B</strong> (standard consultant) bookings only.</p>
                <p><strong className="text-white/60">Condition A</strong> (Ki Business direct) charges consulting fee only — no platform or processing fee shown to client.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Stripe ───────────────────────────────────────── */}
        {tab === 'stripe' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Ki Escrow Keys</h2>
                <p className="mt-0.5 text-xs text-white/30">Used for Ki Escrow and Ki Direct payment modes</p>
              </div>
              <div>
                <label className={LBL}>Publishable Key</label>
                <input type="text" value={settings.stripePublicKey} onChange={set('stripePublicKey')} placeholder="pk_live_…" className={INP} />
              </div>
              <SecretField field="stripeSecretKey" label="Secret Key" placeholder="sk_live_…" />
              <SecretField field="stripeWebhookSecret" label="Webhook Secret" placeholder="whsec_…" />
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Stripe Connect</h2>
                <p className="mt-0.5 text-xs text-white/30">Required for Ki Connect payment mode (auto-split at checkout)</p>
              </div>
              <div>
                <label className={LBL}>Connect Client ID</label>
                <input type="text" value={settings.stripeConnectClientId} onChange={set('stripeConnectClientId')} placeholder="ca_…" className={INP} />
              </div>
            </div>

            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-400/70 space-y-1">
              <p className="font-semibold text-yellow-400">Webhook Endpoint</p>
              <p className="font-mono text-yellow-400/50 break-all">{settings.appUrl || 'https://your-app.netlify.app'}/api/stripe/webhook</p>
              <p>Select event: <strong>checkout.session.completed</strong></p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-white/30 space-y-1">
              <p className="font-semibold text-white/50">POS Slot Rotation</p>
              <p>For multiple Stripe accounts (Ki Business POS rotation), use the <strong className="text-white/40">Integrations → POS Slots</strong> tab.</p>
            </div>
          </div>
        )}

        {/* ── Calendar ─────────────────────────────────────── */}
        {tab === 'calendar' && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Calendar OAuth</h2>
              <p className="mt-0.5 text-xs text-white/30">Enables automatic appointment sync to consultant calendars</p>
            </div>
            <div>
              <label className={LBL}>OAuth Client ID</label>
              <input type="text" value={settings.calendarClientId} onChange={set('calendarClientId')} placeholder="OAuth Client ID" className={INP} />
            </div>
            <SecretField field="calendarClientSecret" label="OAuth Client Secret" placeholder="OAuth Client Secret" />
            <div>
              <label className={LBL}>Redirect URI</label>
              <input type="url" value={settings.calendarRedirectUri} onChange={set('calendarRedirectUri')} placeholder={`${settings.appUrl || 'https://your-app.netlify.app'}/api/auth/calendar/callback`} className={INP} />
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-white/30">
              Ensure the Redirect URI is registered in your OAuth provider's authorized redirect URIs.
            </div>
          </div>
        )}

        {/* ── Firebase ─────────────────────────────────────── */}
        {tab === 'firebase' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Firebase Client Config</h2>
                <p className="mt-0.5 text-xs text-white/30">
                  These are read-only reference values. Active config is set via environment variables in Netlify.
                  Updating here lets admins document which Firebase project is in use.
                </p>
              </div>
              {([
                { key: 'firebaseApiKey',           label: 'API Key',              ph: 'AIzaSy…' },
                { key: 'firebaseAuthDomain',        label: 'Auth Domain',          ph: 'project.firebaseapp.com' },
                { key: 'firebaseProjectId',         label: 'Project ID',           ph: 'ki-business-xyz' },
                { key: 'firebaseStorageBucket',     label: 'Storage Bucket',       ph: 'project.appspot.com' },
                { key: 'firebaseMessagingSenderId', label: 'Messaging Sender ID',  ph: '123456789' },
                { key: 'firebaseAppId',             label: 'App ID',               ph: '1:123:web:abc' },
              ] as { key: keyof PlatformSettings; label: string; ph: string }[]).map(({ key, label, ph }) => (
                <div key={key}>
                  <label className={LBL}>{label}</label>
                  <input type="text" value={settings[key] as string} onChange={set(key)} placeholder={ph} className={INP} />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-[#00F0FF]/15 bg-[#00F0FF]/5 px-4 py-3 text-xs text-[#00F0FF]/60 space-y-1">
              <p className="font-semibold text-[#00F0FF]/80">Netlify Environment Variables</p>
              <p>To change which Firebase project the live app uses, update these in Netlify → Site Settings → Environment Variables:</p>
              <ul className="mt-1 space-y-0.5 font-mono text-[#00F0FF]/40">
                {['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
                  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID'
                ].map((v) => <li key={v}>{v}</li>)}
              </ul>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-red-500/20 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/30 disabled:opacity-50 border border-red-500/20"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
