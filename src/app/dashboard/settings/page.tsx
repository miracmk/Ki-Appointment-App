'use client';

import { useEffect, useRef, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { useUserRole } from '@/lib/use-user-role';
import type { AppRole } from '@/lib/use-user-role';

// ─── Shared styles ────────────────────────────────────────────────────────────

const INP  = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#00F0FF]/60 focus:outline-none transition';
const SEL  = 'w-full rounded-xl border border-white/10 bg-[#161820] px-4 py-2.5 text-sm text-white focus:border-[#00F0FF]/60 focus:outline-none transition';
const LBL  = 'mb-1.5 block text-xs font-medium text-white/50';
const CARD = 'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4';
const SECTION_TITLE = 'text-sm font-semibold uppercase tracking-wide text-white/70';

function SecretInput({ label, value, onChange, placeholder }: {
  label: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className={LBL}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={INP + ' pr-16'}
        />
        <button type="button" onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 hover:text-white/60">
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Profile ─────────────────────────────────────────────────────────────

function TabProfile({ uid, role }: { uid: string; role: AppRole }) {
  const [form, setForm]   = useState({ displayName: '', language: 'en', bio: '', title: '', hourlyRate: '' });
  const [saving, setSave] = useState(false);
  const [msg, setMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) return;
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        setForm({
          displayName: d.displayName ?? '',
          language:    d.language    ?? 'en',
          bio:         d.bio         ?? '',
          title:       d.title       ?? '',
          hourlyRate:  d.hourly_rate_cents ? String(d.hourly_rate_cents / 100) : '',
        });
      }
    })();
  }, [uid]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSave(true); setMsg(null);
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore unavailable');
      const update: Record<string, unknown> = {
        displayName: form.displayName,
        language:    form.language,
        updatedAt:   Date.now(),
      };
      if (role === 'consultant') {
        update.bio   = form.bio;
        update.title = form.title;
        if (form.hourlyRate) update.hourly_rate_cents = Math.round(parseFloat(form.hourlyRate) * 100);
      }
      await updateDoc(doc(db, 'users', uid), update);
      setMsg({ ok: true, text: 'Profile saved.' });
    } catch (err) {
      setMsg({ ok: false, text: String(err) });
    } finally { setSave(false); }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>Identity</h2>
        <div>
          <label htmlFor="profile-name" className={LBL}>Display Name</label>
          <input id="profile-name" type="text" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className={INP} />
        </div>
        <div>
          <label htmlFor="profile-lang" className={LBL}>Language</label>
          <select id="profile-lang" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
            className={SEL}>
            <option value="en">English</option>
            <option value="tr">Türkçe</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
      </div>

      {role === 'consultant' && (
        <div className={CARD}>
          <h2 className={SECTION_TITLE}>Consultant Profile</h2>
          <div>
            <label className={LBL}>Professional Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Tax Consultant · CPA" className={INP} />
          </div>
          <div>
            <label className={LBL}>Bio</label>
            <textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Introduce yourself to potential clients…"
              className={INP + ' resize-none'} />
          </div>
          <div>
            <label className={LBL}>Hourly Rate (USD)</label>
            <input type="number" min="0" step="5" value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} placeholder="150" className={INP} />
          </div>
        </div>
      )}

      {msg && (
        <div className={`rounded-xl p-3.5 text-sm ${msg.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {msg.text}
        </div>
      )}
      <button type="submit" disabled={saving}
        className="rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 px-6 py-2.5 text-sm font-semibold text-[#00F0FF] transition hover:bg-[#00F0FF]/20 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Profile'}
      </button>
    </form>
  );
}

// ─── Tab: Integrations (consultant+) ─────────────────────────────────────────

function TabIntegrations({ uid }: { uid: string }) {
  const [paymentMode, setPaymentMode] = useState('ki_escrow');
  const [stripeKeys, setStripeKeys]   = useState({ public: '', secret: '', webhook: '' });
  const [calConnected, setCalConn]    = useState(false);
  const [vidConnected, setVidConn]    = useState(false);
  const [saving, setSave]             = useState(false);
  const [msg, setMsg]                 = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) return;
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        setPaymentMode(d.paymentMethod ?? 'ki_escrow');
        setStripeKeys({ public: d.stripePublicKey ?? '', secret: d.stripeSecretKey ?? '', webhook: d.webhookSecret ?? '' });
        setCalConn(d.calendarConnected ?? false);
        setVidConn(d.videoCallConnected ?? false);
      }
    })();
  }, [uid]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSave(true); setMsg(null);
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore unavailable');
      const update: Record<string, unknown> = { paymentMethod: paymentMode, updatedAt: Date.now() };
      if (paymentMode === 'own_key') {
        update.stripePublicKey = stripeKeys.public;
        update.stripeSecretKey = stripeKeys.secret;
        update.webhookSecret   = stripeKeys.webhook;
      }
      await updateDoc(doc(db, 'users', uid), update);
      setMsg({ ok: true, text: 'Integration settings saved.' });
    } catch (err) {
      setMsg({ ok: false, text: String(err) });
    } finally { setSave(false); }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      {/* Payment mode */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>Payment Mode</h2>
        <div>
          <label htmlFor="payment-mode" className={LBL}>Select how you receive payments</label>
          <select id="payment-mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={SEL}>
            <option value="ki_escrow">Ki Escrow — Ki Business holds and transfers funds (default)</option>
            <option value="own_key">Own Stripe Keys — Clients pay directly to your Stripe</option>
            <option value="ki_connect">Ki Connect — Automatic split via Stripe Connect</option>
          </select>
        </div>

        {paymentMode === 'ki_escrow' && (
          <div className="rounded-xl border border-[#00F0FF]/10 bg-[#00F0FF]/5 px-4 py-3 text-sm text-[#00F0FF]/70">
            Ki Business holds funds in escrow and transfers your payout minus the 10% platform fee after each completed session.
          </div>
        )}

        {paymentMode === 'own_key' && (
          <div className="space-y-4">
            <p className="text-xs text-white/40">Your clients pay directly to your Stripe account. You owe Ki Business 10% platform fee via your Ki Wallet.</p>
            <SecretInput label="Stripe Publishable Key" value={stripeKeys.public} onChange={(v) => setStripeKeys({ ...stripeKeys, public: v })} placeholder="pk_live_…" />
            <SecretInput label="Stripe Secret Key" value={stripeKeys.secret} onChange={(v) => setStripeKeys({ ...stripeKeys, secret: v })} placeholder="sk_live_…" />
            <SecretInput label="Webhook Secret" value={stripeKeys.webhook} onChange={(v) => setStripeKeys({ ...stripeKeys, webhook: v })} placeholder="whsec_…" />
          </div>
        )}

        {paymentMode === 'ki_connect' && (
          <div className="rounded-xl border border-[#B000FF]/10 bg-[#B000FF]/5 px-4 py-3 text-sm text-[#B000FF]/70">
            Stripe Connect automatically splits the payment at checkout. Contact your administrator to set up Connect for your account.
          </div>
        )}
      </div>

      {/* Calendar & video */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>Calendar & Video</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Calendar Sync</p>
              <p className="text-xs text-white/40">Sync your availability automatically</p>
            </div>
            <span className={`text-xs font-medium ${calConnected ? 'text-emerald-400' : 'text-white/30'}`}>
              {calConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Video Calls</p>
              <p className="text-xs text-white/40">Auto-generate video call links</p>
            </div>
            <span className={`text-xs font-medium ${vidConnected ? 'text-emerald-400' : 'text-white/30'}`}>
              {vidConnected ? 'Connected' : 'Not connected'}
            </span>
          </div>
        </div>
        <p className="text-xs text-white/25">Calendar and video call OAuth connections are managed by your administrator. Contact support if you need to connect your accounts.</p>
      </div>

      {msg && (
        <div className={`rounded-xl p-3.5 text-sm ${msg.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {msg.text}
        </div>
      )}
      <button type="submit" disabled={saving}
        className="rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 px-6 py-2.5 text-sm font-semibold text-[#00F0FF] transition hover:bg-[#00F0FF]/20 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Integrations'}
      </button>
    </form>
  );
}

// ─── Tab: Consultants (supervisor+) ──────────────────────────────────────────

interface KycRow {
  uid: string;
  name: string;
  email: string;
  kycStatus: string;
  role: string;
}

function TabConsultants() {
  const [rows, setRows]           = useState<KycRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const [consultants, kycSubmissions] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'consultant'))),
        getDocs(collection(db, 'kyc_submissions')),
      ]);
      const kycMap = new Map<string, string>();
      kycSubmissions.docs.forEach((d) => kycMap.set(d.id, d.data().status ?? 'unknown'));

      setRows(consultants.docs.map((d) => ({
        uid:       d.id,
        name:      d.data().displayName ?? '—',
        email:     d.data().email ?? '',
        kycStatus: kycMap.get(d.id) ?? d.data().kycStatus ?? 'none',
        role:      d.data().role ?? 'consultant',
      })));
      setLoading(false);
    })();
  }, []);

  const approveKyc = async (uid: string) => {
    setActioning(uid);
    try {
      const auth  = getFirebaseAuth();
      const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!token) return;
      await fetch('/api/admin/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid, action: 'approve' }),
      });
      setRows((prev) => prev.map((r) => r.uid === uid ? { ...r, kycStatus: 'verified' } : r));
    } finally { setActioning(null); }
  };

  const rejectKyc = async (uid: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    setActioning(uid);
    try {
      const auth  = getFirebaseAuth();
      const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!token) return;
      await fetch('/api/admin/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid, action: 'reject', reason }),
      });
      setRows((prev) => prev.map((r) => r.uid === uid ? { ...r, kycStatus: 'rejected' } : r));
    } finally { setActioning(null); }
  };

  const filtered = rows.filter(
    (r) => !search || r.email.includes(search) || r.name.toLowerCase().includes(search.toLowerCase())
  );

  const KYC_BADGE: Record<string, string> = {
    verified: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    pending:  'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    rejected: 'border-red-500/30 bg-red-500/10 text-red-400',
    none:     'border-white/10 bg-white/5 text-white/30',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className={SECTION_TITLE}>Active Consultants</h2>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/20 focus:border-[#00F0FF]/60 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">No consultants found.</p>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">Name</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40 sm:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">KYC</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((r) => (
                <tr key={r.uid} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                  <td className="hidden px-4 py-3 text-white/50 sm:table-cell">{r.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-medium ${KYC_BADGE[r.kycStatus] ?? KYC_BADGE.none}`}>
                      {r.kycStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.kycStatus === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => approveKyc(r.uid)} disabled={actioning === r.uid}
                          className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50">
                          Approve
                        </button>
                        <button type="button" onClick={() => rejectKyc(r.uid)} disabled={actioning === r.uid}
                          className="rounded-lg bg-red-500/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-500/30 disabled:opacity-50">
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Platform Config (admin only) ───────────────────────────────────────

interface PlatformCfg {
  platformName: string; platformEmail: string; supportEmail: string;
  platformFeeBps: number; appUrl: string;
  stripePublicKey: string; stripeSecretKey: string;
  stripeWebhookSecret: string; stripeConnectClientId: string;
  calendarClientId: string; calendarClientSecret: string; calendarRedirectUri: string;
  firebaseApiKey: string; firebaseAuthDomain: string; firebaseProjectId: string;
  firebaseStorageBucket: string; firebaseMessagingSenderId: string; firebaseAppId: string;
}

const PLATFORM_DEFAULTS: PlatformCfg = {
  platformName: 'Ki Business', platformEmail: 'consultation@kibusiness.co',
  supportEmail: 'consultation@kibusiness.co', platformFeeBps: 1000, appUrl: '',
  stripePublicKey: '', stripeSecretKey: '', stripeWebhookSecret: '', stripeConnectClientId: '',
  calendarClientId: '', calendarClientSecret: '', calendarRedirectUri: '',
  firebaseApiKey: '', firebaseAuthDomain: '', firebaseProjectId: '',
  firebaseStorageBucket: '', firebaseMessagingSenderId: '', firebaseAppId: '',
};

type PlatformTab = 'identity' | 'stripe' | 'calendar' | 'firebase';

function TabPlatform() {
  const [cfg, setCfg]           = useState<PlatformCfg>(PLATFORM_DEFAULTS);
  const [sub, setSub]           = useState<PlatformTab>('identity');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, 'platform_settings', 'config'));
        if (snap.exists()) setCfg((prev) => ({ ...prev, ...snap.data() }));
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const set = (key: keyof PlatformCfg) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setCfg((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore unavailable');
      await setDoc(doc(db, 'platform_settings', 'config'), { ...cfg, updatedAt: Date.now() });
      setMsg({ ok: true, text: 'Platform settings saved.' });
    } catch (err) {
      setMsg({ ok: false, text: String(err) });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-red-400 border-t-transparent" /></div>;

  const SUB_TABS: { id: PlatformTab; label: string }[] = [
    { id: 'identity', label: 'Identity & Fees' },
    { id: 'stripe',   label: 'Stripe' },
    { id: 'calendar', label: 'Calendar OAuth' },
    { id: 'firebase', label: 'Firebase' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-white/[0.06]">
        {SUB_TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setSub(t.id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition ${
              sub === t.id ? 'border-red-400 text-red-400' : 'border-transparent text-white/40 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={save} className="space-y-4">
        {sub === 'identity' && (
          <div className={CARD}>
            <h2 className={SECTION_TITLE}>Platform Identity</h2>
            <div>
              <label htmlFor="platform-name" className={LBL}>Platform Name</label>
              <input id="platform-name" type="text" value={cfg.platformName} onChange={set('platformName')} className={INP} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="p-email" className={LBL}>Platform Email</label>
                <input id="p-email" type="email" value={cfg.platformEmail} onChange={set('platformEmail')} className={INP} />
              </div>
              <div>
                <label htmlFor="s-email" className={LBL}>Support Email</label>
                <input id="s-email" type="email" value={cfg.supportEmail} onChange={set('supportEmail')} className={INP} />
              </div>
            </div>
            <div>
              <label className={LBL}>App URL</label>
              <input type="url" value={cfg.appUrl} onChange={set('appUrl')} placeholder="https://your-app.netlify.app" className={INP} />
            </div>
            <div>
              <label htmlFor="platform-fee" className={LBL}>Platform Fee — <span className="text-white/30">currently {(cfg.platformFeeBps as number) / 100}%</span></label>
              <input id="platform-fee" type="number" min={0} max={5000} step={50}
                value={cfg.platformFeeBps}
                onChange={(e) => setCfg((p) => ({ ...p, platformFeeBps: Number(e.target.value) }))}
                className={INP} />
              <p className="mt-1.5 text-xs text-white/25">Basis points: 1000 = 10%, 500 = 5%</p>
            </div>
          </div>
        )}

        {sub === 'stripe' && (
          <div className="space-y-4">
            <div className={CARD}>
              <h2 className={SECTION_TITLE}>Ki Escrow Keys</h2>
              <p className="text-xs text-white/30">Used for Ki Escrow and direct payment modes.</p>
              <div>
                <label className={LBL}>Publishable Key</label>
                <input type="text" value={cfg.stripePublicKey} onChange={set('stripePublicKey')} placeholder="pk_live_…" className={INP} />
              </div>
              <SecretInput label="Secret Key" value={cfg.stripeSecretKey} onChange={(v) => setCfg((p) => ({ ...p, stripeSecretKey: v }))} placeholder="sk_live_…" />
              <SecretInput label="Webhook Secret" value={cfg.stripeWebhookSecret} onChange={(v) => setCfg((p) => ({ ...p, stripeWebhookSecret: v }))} placeholder="whsec_…" />
            </div>
            <div className={CARD}>
              <h2 className={SECTION_TITLE}>Stripe Connect</h2>
              <div>
                <label className={LBL}>Connect Client ID</label>
                <input type="text" value={cfg.stripeConnectClientId} onChange={set('stripeConnectClientId')} placeholder="ca_…" className={INP} />
              </div>
            </div>
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-400/70">
              <p className="font-semibold text-yellow-400">Webhook Endpoint</p>
              <p className="mt-1 font-mono text-yellow-400/50 break-all">{cfg.appUrl || 'https://your-app.netlify.app'}/api/stripe/webhook</p>
            </div>
          </div>
        )}

        {sub === 'calendar' && (
          <div className={CARD}>
            <h2 className={SECTION_TITLE}>Calendar OAuth</h2>
            <div>
              <label className={LBL}>OAuth Client ID</label>
              <input type="text" value={cfg.calendarClientId} onChange={set('calendarClientId')} placeholder="OAuth Client ID" className={INP} />
            </div>
            <SecretInput label="OAuth Client Secret" value={cfg.calendarClientSecret} onChange={(v) => setCfg((p) => ({ ...p, calendarClientSecret: v }))} placeholder="OAuth Client Secret" />
            <div>
              <label className={LBL}>Redirect URI</label>
              <input type="url" value={cfg.calendarRedirectUri} onChange={set('calendarRedirectUri')}
                placeholder={`${cfg.appUrl || 'https://your-app.netlify.app'}/api/auth/calendar/callback`} className={INP} />
            </div>
          </div>
        )}

        {sub === 'firebase' && (
          <div className="space-y-4">
            <div className={CARD}>
              <h2 className={SECTION_TITLE}>Firebase Client Config</h2>
              <p className="text-xs text-white/30">Reference values — active config is set via Netlify environment variables.</p>
              {([
                { key: 'firebaseApiKey',           label: 'API Key',             ph: 'AIzaSy…' },
                { key: 'firebaseAuthDomain',        label: 'Auth Domain',         ph: 'project.firebaseapp.com' },
                { key: 'firebaseProjectId',         label: 'Project ID',          ph: 'ki-business-xyz' },
                { key: 'firebaseStorageBucket',     label: 'Storage Bucket',      ph: 'project.appspot.com' },
                { key: 'firebaseMessagingSenderId', label: 'Messaging Sender ID', ph: '123456789' },
                { key: 'firebaseAppId',             label: 'App ID',              ph: '1:123:web:abc' },
              ] as { key: keyof PlatformCfg; label: string; ph: string }[]).map(({ key, label, ph }) => (
                <div key={key as string}>
                  <label className={LBL}>{label}</label>
                  <input type="text" value={cfg[key] as string} onChange={set(key)} placeholder={ph} className={INP} />
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[#00F0FF]/15 bg-[#00F0FF]/5 px-4 py-3 text-xs text-[#00F0FF]/60 space-y-1">
              <p className="font-semibold text-[#00F0FF]/80">Netlify Environment Variables</p>
              <ul className="mt-1 space-y-0.5 font-mono text-[#00F0FF]/40">
                {['NEXT_PUBLIC_FIREBASE_API_KEY','NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN','NEXT_PUBLIC_FIREBASE_PROJECT_ID',
                  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET','NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID','NEXT_PUBLIC_FIREBASE_APP_ID',
                ].map((v) => <li key={v}>{v}</li>)}
              </ul>
            </div>
          </div>
        )}

        {msg && (
          <div className={`rounded-xl p-3.5 text-sm ${msg.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {msg.text}
          </div>
        )}
        <button type="submit" disabled={saving}
          className="w-full rounded-xl border border-red-500/20 bg-red-500/20 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/30 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Platform Settings'}
        </button>
      </form>
    </div>
  );
}

// ─── Root settings page ───────────────────────────────────────────────────────

type Tab = 'profile' | 'integrations' | 'consultants' | 'platform';

export default function SettingsPage() {
  const { user } = useUserRole();
  const searchParams = useSearchParams();
  const [uid, setUid] = useState<string | null>(null);

  const isConsultant = user?.role === 'consultant';
  const isManagement = user?.role === 'admin' || user?.role === 'supervisor';
  const isAdmin      = user?.role === 'admin';

  const defaultTab = (): Tab => {
    const param = searchParams.get('tab') as Tab | null;
    if (param && ['profile','integrations','consultants','platform'].includes(param)) return param;
    return 'profile';
  };
  const [tab, setTab] = useState<Tab>(defaultTab);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  const TABS: { id: Tab; label: string; roles: AppRole[] }[] = [
    { id: 'profile',      label: 'Profile',          roles: ['admin','supervisor','consultant','client'] },
    { id: 'integrations', label: 'Integrations',     roles: ['admin','supervisor','consultant'] },
    { id: 'consultants',  label: 'Consultants',      roles: ['admin','supervisor'] },
    { id: 'platform',     label: 'Platform Config',  roles: ['admin'] },
  ];

  const visibleTabs = TABS.filter((t) => user?.role && t.roles.includes(user.role));

  if (!uid || !user) return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-white/40">Manage your account, integrations, and platform configuration.</p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-white/[0.06]">
        {visibleTabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.id
                ? t.id === 'platform'
                  ? 'border-red-400 text-red-400'
                  : 'border-[#00F0FF] text-[#00F0FF]'
                : 'border-transparent text-white/40 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile'      && <TabProfile uid={uid} role={user.role} />}
      {tab === 'integrations' && (isConsultant || isManagement) && <TabIntegrations uid={uid} />}
      {tab === 'consultants'  && isManagement && <TabConsultants />}
      {tab === 'platform'     && isAdmin      && <TabPlatform />}
    </div>
  );
}
