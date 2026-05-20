'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getFirebaseAuth, getFirebaseClientApp } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import type { PaymentMode } from '@/types/marketplace';

type ActiveTab = 'payment' | 'stripe' | 'profile' | 'calendar' | 'outlook' | 'pos';

const MODE_DETAILS: { mode: PaymentMode; label: string; desc: string }[] = [
  { mode: 'ki_escrow',  label: 'Ki Escrow',       desc: 'Platform collects, transfers to consultant minus fees' },
  { mode: 'own_keys',   label: 'Own Stripe Keys',  desc: 'Consultant collects directly; owes 10% per booking' },
  { mode: 'ki_connect', label: 'Stripe Connect',   desc: 'Automatic 10% deduction at checkout via Connect' },
  { mode: 'direct',     label: 'Ki Direct',        desc: 'Ki Business is the consultant — no platform fee' },
];

const INPUT_CLS = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-[#00F0FF]/50 focus:outline-none';
const LABEL_CLS = 'mb-1.5 block text-xs font-medium text-white/60';

export default function ConsultantIntegrationsPage() {
  const searchParams = useSearchParams();
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<ActiveTab>('payment');
  const [feedback,   setFeedback]   = useState<{ message: string; ok: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [stripeForm,  setStripeForm]  = useState({ consultant_id: '', api_key: '', webhook_secret: '' });
  const [profileForm, setProfileForm] = useState({ consultant_id: '', name: '', title: '', expertise: '', photo_url: '' });
  const [calendarForm, setCalendarForm] = useState({ consultant_id: '', refresh_token: '', calendar_id: 'primary' });
  const [outlookForm,  setOutlookForm]  = useState({ consultant_id: '', refresh_token: '' });
  const [posSlots,  setPosSlots]  = useState<any[]>([]);
  const [posForm,   setPosForm]   = useState({ slot_id: '', label: '', publishable_key: '', secret_key: '', webhook_secret: '' });
  const [posLoading, setPosLoading] = useState(false);

  const [paymentConsultantId, setPaymentConsultantId] = useState('');
  const [selectedMode, setSelectedMode]   = useState<PaymentMode>('own_keys');
  const [connectAccountId, setConnectAccountId] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://ki-appointment.netlify.app';
  const webhookUrl = `${appUrl}/api/stripe/webhook`;

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, (u) => {
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const ok  = searchParams.get('connect_success');
    const err = searchParams.get('connect_error');
    const acct = searchParams.get('account_id');
    if (ok) {
      setActiveTab('payment');
      setFeedback({ message: `Stripe Connect linked! Account: ${acct || ''}`, ok: true });
      if (acct) setConnectAccountId(acct);
    } else if (err) {
      setActiveTab('payment');
      setFeedback({ message: `Stripe Connect error: ${decodeURIComponent(err)}`, ok: false });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!paymentConsultantId.trim()) { setConnectAccountId(null); return; }
    (async () => {
      try {
        const app = getFirebaseClientApp();
        if (!app) return;
        const db   = getFirestore(app);
        const snap = await getDoc(doc(db, 'users', paymentConsultantId.trim()));
        if (snap.exists()) {
          const d = snap.data();
          if (d.payment_mode) setSelectedMode(d.payment_mode as PaymentMode);
          setConnectAccountId(d.stripe_connect_account_id ?? null);
        }
      } catch { /* ignore */ }
    })();
  }, [paymentConsultantId]);

  useEffect(() => {
    if (activeTab !== 'pos') return;
    (async () => {
      setPosLoading(true);
      try {
        const token = await getToken();
        const res   = await fetch('/api/admin/pos-settings', { headers: { Authorization: `Bearer ${token}` } });
        const data  = await res.json();
        if (res.ok) setPosSlots(data.slots || []);
        else setFeedback({ message: data.error || 'Failed to load POS slots.', ok: false });
      } catch (e: any) {
        setFeedback({ message: e.message, ok: false });
      } finally {
        setPosLoading(false);
      }
    })();
  }, [activeTab]);

  const getToken = async (): Promise<string> => {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (!user) throw new Error('No active session.');
    return user.getIdToken();
  };

  const callApi = async (body: Record<string, string>) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const token = await getToken();
      const res  = await fetch('/api/admin/consultant-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed.');
      setFeedback({ message: data.message || 'Saved.', ok: true });
    } catch (e: any) {
      setFeedback({ message: e.message, ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const callPosApi = async (body: Record<string, string>) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const token = await getToken();
      const res  = await fetch('/api/admin/pos-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed.');
      setFeedback({ message: data.message || 'Saved.', ok: true });
      if (['save_slot', 'activate_slot', 'delete_slot'].includes(body.action)) {
        const r2 = await fetch('/api/admin/pos-settings', { headers: { Authorization: `Bearer ${token}` } });
        const d2 = await r2.json();
        if (r2.ok) setPosSlots(d2.slots || []);
      }
    } catch (e: any) {
      setFeedback({ message: e.message, ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const set = <T extends Record<string, string>>(
    setter: React.Dispatch<React.SetStateAction<T>>, field: keyof T
  ) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setter((prev) => ({ ...prev, [field]: e.target.value }));

  const handleConnectOAuth = async () => {
    if (!paymentConsultantId.trim()) { setFeedback({ message: 'Enter a Consultant UID first.', ok: false }); return; }
    setConnectLoading(true);
    setFeedback(null);
    try {
      const token = await getToken();
      const res  = await fetch(`/api/stripe/connect/oauth?consultant_id=${encodeURIComponent(paymentConsultantId.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create OAuth URL.');
      window.location.href = data.oauth_url;
    } catch (e: any) {
      setFeedback({ message: e.message, ok: false });
    } finally {
      setConnectLoading(false);
    }
  };

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'payment',  label: 'Payment Mode' },
    { id: 'stripe',   label: 'Stripe' },
    { id: 'profile',  label: 'Profile' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'outlook',  label: 'Outlook' },
    { id: 'pos',      label: 'POS Slots' },
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
        <h1 className="text-2xl font-bold text-white">Consultant Integrations</h1>
        <p className="mt-1 text-sm text-white/40">Configure payment modes, Stripe keys, and calendar connections per consultant.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-white/[0.06] pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); setFeedback(null); }}
            className={`shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'border-b-2 border-[#00F0FF] text-[#00F0FF]'
                : 'text-white/40 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mb-5 rounded-xl p-3.5 text-sm ${feedback.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {feedback.message}
        </div>
      )}

      {/* Payment Mode Tab */}
      {activeTab === 'payment' && (
        <div className="space-y-5">
          <p className="text-sm text-white/40">Select how this consultant collects payment from clients.</p>

          <div>
            <label htmlFor="pay-uid" className={LABEL_CLS}>Consultant UID</label>
            <input
              id="pay-uid" type="text" value={paymentConsultantId}
              onChange={(e) => setPaymentConsultantId(e.target.value)}
              placeholder="firebase-uid…" className={INPUT_CLS}
            />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); callApi({ action: 'update_payment_mode', consultant_id: paymentConsultantId.trim(), payment_mode: selectedMode }); }} className="space-y-3">
            <p className={LABEL_CLS}>Payment Mode</p>
            {MODE_DETAILS.map(({ mode, label, desc }) => (
              <label
                key={mode}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  selectedMode === mode
                    ? 'border-[#00F0FF]/40 bg-[#00F0FF]/5'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <input
                  type="radio" name="payment_mode" value={mode}
                  checked={selectedMode === mode}
                  onChange={() => setSelectedMode(mode)}
                  className="mt-0.5"
                />
                <div>
                  <span className="block text-sm font-medium text-white">{label}</span>
                  <span className="block text-xs text-white/40 mt-0.5">{desc}</span>
                </div>
              </label>
            ))}
            <button type="submit" disabled={submitting}
              className="w-full rounded-xl bg-[#00F0FF]/10 py-2.5 text-sm font-medium text-[#00F0FF] transition hover:bg-[#00F0FF]/20 disabled:opacity-50">
              {submitting ? 'Saving…' : 'Save Payment Mode'}
            </button>
          </form>

          {(selectedMode === 'ki_connect' || selectedMode === 'ki_escrow') && (
            <div className="rounded-xl border border-[#0047FF]/30 bg-[#0047FF]/5 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">Stripe Connect</h3>
              {connectAccountId ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-sm text-emerald-400 font-medium">Connected</span>
                  </div>
                  <p className="font-mono text-xs text-white/40 break-all">{connectAccountId}</p>
                  <button type="button" onClick={handleConnectOAuth} disabled={connectLoading || !paymentConsultantId.trim()}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 disabled:opacity-50">
                    {connectLoading ? 'Redirecting…' : 'Reconnect'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-white/50">No Stripe Connect account linked yet.</p>
                  <button type="button" onClick={handleConnectOAuth} disabled={connectLoading || !paymentConsultantId.trim()}
                    className="rounded-xl bg-[#0047FF]/20 px-5 py-2.5 text-sm font-semibold text-[#6B9FFF] transition hover:bg-[#0047FF]/30 disabled:opacity-50">
                    {connectLoading ? 'Redirecting…' : 'Link Stripe Connect Account'}
                  </button>
                  {!paymentConsultantId.trim() && <p className="text-xs text-white/30">Enter a Consultant UID first.</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stripe Tab */}
      {activeTab === 'stripe' && (
        <form onSubmit={(e) => { e.preventDefault(); callApi({ action: 'update_stripe', ...stripeForm }); }} className="space-y-4">
          <p className="text-sm text-white/40">Consultant's own Stripe credentials (Own Keys mode only).</p>
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-400/80 space-y-1">
            <p className="font-semibold text-yellow-400">Consultant Webhook URL:</p>
            <p className="font-mono text-xs break-all select-all">{webhookUrl}</p>
            <p className="text-xs mt-1 text-yellow-400/60">Consultant must add this URL in Stripe → Developers → Webhooks with the <strong>checkout.session.completed</strong> event.</p>
          </div>
          {([
            { f: 'consultant_id', l: 'Consultant UID', type: 'text',     ph: 'firebase-uid…' },
            { f: 'api_key',       l: 'Stripe Secret Key', type: 'password', ph: 'sk_live_…' },
            { f: 'webhook_secret',l: 'Webhook Secret',    type: 'password', ph: 'whsec_…' },
          ] as { f: keyof typeof stripeForm; l: string; type: string; ph: string }[]).map(({ f, l, type, ph }) => (
            <div key={f}>
              <label htmlFor={`s-${f}`} className={LABEL_CLS}>{l}</label>
              <input id={`s-${f}`} type={type} value={stripeForm[f]} onChange={set(setStripeForm, f)} required placeholder={ph} className={INPUT_CLS} />
            </div>
          ))}
          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-[#00F0FF]/10 py-2.5 text-sm font-medium text-[#00F0FF] transition hover:bg-[#00F0FF]/20 disabled:opacity-50">
            {submitting ? 'Saving…' : 'Save Stripe Settings'}
          </button>
        </form>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={(e) => { e.preventDefault(); callApi({ action: 'update_profile', ...profileForm }); }} className="space-y-4">
          <p className="text-sm text-white/40">Profile displayed on the marketplace and checkout page.</p>
          {([
            { f: 'consultant_id', l: 'Consultant UID', type: 'text', ph: 'firebase-uid…' },
            { f: 'name',         l: 'Full Name',       type: 'text', ph: 'John Smith' },
            { f: 'title',        l: 'Title',           type: 'text', ph: 'Senior Tax Consultant' },
            { f: 'expertise',    l: 'Expertise',       type: 'text', ph: 'Tax, Customs, Immigration' },
            { f: 'photo_url',    l: 'Photo URL',       type: 'url',  ph: 'https://…' },
          ] as { f: keyof typeof profileForm; l: string; type: string; ph: string }[]).map(({ f, l, type, ph }) => (
            <div key={f}>
              <label htmlFor={`p-${f}`} className={LABEL_CLS}>{l}</label>
              <input id={`p-${f}`} type={type} value={profileForm[f]} onChange={set(setProfileForm, f)} placeholder={ph} className={INPUT_CLS} />
            </div>
          ))}
          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-[#00F0FF]/10 py-2.5 text-sm font-medium text-[#00F0FF] transition hover:bg-[#00F0FF]/20 disabled:opacity-50">
            {submitting ? 'Saving…' : 'Update Profile'}
          </button>
        </form>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <form onSubmit={(e) => { e.preventDefault(); callApi({ action: 'update_calendar', ...calendarForm }); }} className="space-y-4">
          <p className="text-sm text-white/40">Calendar OAuth refresh token for automatic appointment sync.</p>
          {([
            { f: 'consultant_id',  l: 'Consultant UID',      type: 'text',     ph: 'firebase-uid…' },
            { f: 'refresh_token',  l: 'Calendar Refresh Token', type: 'password', ph: '1//…' },
            { f: 'calendar_id',    l: 'Calendar ID',          type: 'text',     ph: 'primary' },
          ] as { f: keyof typeof calendarForm; l: string; type: string; ph: string }[]).map(({ f, l, type, ph }) => (
            <div key={f}>
              <label htmlFor={`c-${f}`} className={LABEL_CLS}>{l}</label>
              <input id={`c-${f}`} type={type} value={calendarForm[f]} onChange={set(setCalendarForm, f)} required placeholder={ph} className={INPUT_CLS} />
            </div>
          ))}
          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-[#00F0FF]/10 py-2.5 text-sm font-medium text-[#00F0FF] transition hover:bg-[#00F0FF]/20 disabled:opacity-50">
            {submitting ? 'Saving…' : 'Connect Calendar'}
          </button>
        </form>
      )}

      {/* Outlook Tab */}
      {activeTab === 'outlook' && (
        <form onSubmit={(e) => { e.preventDefault(); callApi({ action: 'update_outlook', ...outlookForm }); }} className="space-y-4">
          <p className="text-sm text-white/40">Microsoft OAuth refresh token. Requires Calendars.ReadWrite permission.</p>
          {([
            { f: 'consultant_id', l: 'Consultant UID',     type: 'text',     ph: 'firebase-uid…' },
            { f: 'refresh_token', l: 'Microsoft Refresh Token', type: 'password', ph: 'M.R3_…' },
          ] as { f: keyof typeof outlookForm; l: string; type: string; ph: string }[]).map(({ f, l, type, ph }) => (
            <div key={f}>
              <label htmlFor={`o-${f}`} className={LABEL_CLS}>{l}</label>
              <input id={`o-${f}`} type={type} value={outlookForm[f]} onChange={set(setOutlookForm, f)} required placeholder={ph} className={INPUT_CLS} />
            </div>
          ))}
          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-[#00F0FF]/10 py-2.5 text-sm font-medium text-[#00F0FF] transition hover:bg-[#00F0FF]/20 disabled:opacity-50">
            {submitting ? 'Saving…' : 'Connect Outlook Calendar'}
          </button>
        </form>
      )}

      {/* POS Rotation Tab */}
      {activeTab === 'pos' && (
        <div className="space-y-5">
          <p className="text-sm text-white/40">Manage platform Stripe keys. Activate a slot to use it for all Ki Escrow/Direct payments.</p>

          <div className="rounded-xl border border-[#00F0FF]/20 bg-[#00F0FF]/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-[#00F0FF]">Platform Webhook URL</p>
            <p className="font-mono text-xs text-white/60 break-all select-all">{webhookUrl}</p>
            <p className="text-xs text-white/30">Add this in Stripe → Webhooks with event <strong>checkout.session.completed</strong>.</p>
          </div>

          {/* Existing slots */}
          <div className="space-y-3">
            {posLoading ? (
              <p className="text-sm text-white/30">Loading slots…</p>
            ) : posSlots.length === 0 ? (
              <p className="text-sm text-white/30">No POS slots yet.</p>
            ) : (
              posSlots.map((slot) => (
                <div key={slot.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{slot.label}</p>
                      <p className="text-xs text-white/30">ID: {slot.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {slot.isActive && (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">Active</span>
                      )}
                      <button type="button" onClick={() => callPosApi({ action: 'activate_slot', slot_id: slot.id })} disabled={submitting}
                        className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50">
                        Activate
                      </button>
                      <button type="button" onClick={() => setPosForm({ slot_id: slot.id, label: slot.label, publishable_key: '', secret_key: '', webhook_secret: '' })}
                        className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white">
                        Edit
                      </button>
                      <button type="button" onClick={() => callPosApi({ action: 'delete_slot', slot_id: slot.id })} disabled={submitting}
                        className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add / Edit form */}
          <form onSubmit={(e) => { e.preventDefault(); callPosApi({ action: 'save_slot', ...posForm }); setPosForm({ slot_id: '', label: '', publishable_key: '', secret_key: '', webhook_secret: '' }); }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">{posForm.slot_id ? 'Edit Slot' : 'New Slot'}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                { f: 'label',           l: 'Slot Label',      type: 'text',     ph: 'Primary POS' },
                { f: 'publishable_key', l: 'Publishable Key', type: 'text',     ph: 'pk_live_…' },
                { f: 'secret_key',      l: 'Secret Key',      type: 'password', ph: 'sk_live_…' },
                { f: 'webhook_secret',  l: 'Webhook Secret',  type: 'password', ph: 'whsec_…' },
              ] as { f: keyof typeof posForm; l: string; type: string; ph: string }[]).map(({ f, l, type, ph }) => (
                <div key={f}>
                  <label htmlFor={`pos-${f}`} className={LABEL_CLS}>{l}</label>
                  <input id={`pos-${f}`} type={type} value={posForm[f]} onChange={set(setPosForm, f)} required placeholder={ph} className={INPUT_CLS} />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="flex-1 rounded-xl bg-[#00F0FF]/10 py-2.5 text-sm font-medium text-[#00F0FF] transition hover:bg-[#00F0FF]/20 disabled:opacity-50">
                {submitting ? 'Saving…' : posForm.slot_id ? 'Update Slot' : 'Save New Slot'}
              </button>
              {posForm.slot_id && (
                <button type="button" onClick={() => setPosForm({ slot_id: '', label: '', publishable_key: '', secret_key: '', webhook_secret: '' })}
                  className="rounded-xl border border-white/10 px-4 text-sm text-white/40 hover:text-white">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
