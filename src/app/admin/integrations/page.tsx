'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getFirebaseAuth, getFirebaseClientApp } from '@/lib/firebase-client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import type { PaymentMode } from '@/types/marketplace';

type ActiveTab = 'payment' | 'stripe' | 'profile' | 'google' | 'outlook' | 'pos';

const paymentModeLabels: Record<PaymentMode, string> = {
  ki_escrow: 'Ki Business Escrow (platform collects, transfers to consultant)',
  own_keys: 'Own API Keys (consultant collects, 10% contract)',
  ki_connect: 'Stripe Connect (automatic 10% deduction)',
  direct: 'Ki Business Direct (platform is the consultant)',
};

export default function ConsultantIntegrationsPage() {
  const searchParams = useSearchParams();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('payment');
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [stripeForm, setStripeForm] = useState({ consultant_id: '', api_key: '', webhook_secret: '' });
  const [profileForm, setProfileForm] = useState({ consultant_id: '', name: '', title: '', expertise: '', photo_url: '' });
  const [googleForm, setGoogleForm] = useState({ consultant_id: '', refresh_token: '', calendar_id: 'primary' });
  const [outlookForm, setOutlookForm] = useState({ consultant_id: '', refresh_token: '' });
  const [posSlots, setPosSlots] = useState<any[]>([]);
  const [posForm, setPosForm] = useState({ slot_id: '', label: '', publishable_key: '', secret_key: '', webhook_secret: '' });
  const [posLoading, setPosLoading] = useState(false);

  // Payment mode tab state
  const [paymentConsultantId, setPaymentConsultantId] = useState('');
  const [selectedMode, setSelectedMode] = useState<PaymentMode>('own_keys');
  const [connectAccountId, setConnectAccountId] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setUserEmail(null); setIsAdmin(false); setLoading(false); return; }

      const email = user.email ?? '';
      setUserEmail(email);
      const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? 'admin@kibusiness.co')
        .split(',')
        .map((e) => e.trim().toLowerCase());
      setIsAdmin(adminEmails.includes(email.toLowerCase()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle Stripe Connect OAuth redirect params
  useEffect(() => {
    const connectSuccess = searchParams.get('connect_success');
    const connectError = searchParams.get('connect_error');
    const accountId = searchParams.get('account_id');

    if (connectSuccess) {
      setActiveTab('payment');
      setFeedback({ message: `Stripe Connect linked! Account: ${accountId || ''}`, ok: true });
      if (accountId) setConnectAccountId(accountId);
    } else if (connectError) {
      setActiveTab('payment');
      setFeedback({ message: `Stripe Connect error: ${decodeURIComponent(connectError)}`, ok: false });
    }
  }, [searchParams]);

  // Load consultant's current payment mode and connect account when consultant_id changes
  useEffect(() => {
    if (!paymentConsultantId.trim()) { setConnectAccountId(null); return; }

    const loadConsultantData = async () => {
      try {
        const app = getFirebaseClientApp();
        if (!app) return;
        const db = getFirestore(app);
        const snap = await getDoc(doc(db, 'users', paymentConsultantId.trim()));
        if (snap.exists()) {
          const data = snap.data();
          if (data.payment_mode) setSelectedMode(data.payment_mode as PaymentMode);
          setConnectAccountId(data.stripe_connect_account_id ?? null);
        }
      } catch {
        // silently ignore
      }
    };

    loadConsultantData();
  }, [paymentConsultantId]);

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
    setUserEmail(null);
    setIsAdmin(false);
  };

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
      const res = await fetch('/api/admin/consultant-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed.');
      setFeedback({ message: data.message || 'Saved.', ok: true });
    } catch (err: any) {
      setFeedback({ message: err.message || 'An error occurred.', ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStripe = (e: React.FormEvent) => {
    e.preventDefault();
    callApi({ action: 'update_stripe', ...stripeForm });
  };

  const handleProfile = (e: React.FormEvent) => {
    e.preventDefault();
    callApi({ action: 'update_profile', ...profileForm });
  };

  const handleGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    callApi({ action: 'update_google', ...googleForm });
  };

  const handleOutlook = (e: React.FormEvent) => {
    e.preventDefault();
    callApi({ action: 'update_outlook', ...outlookForm });
  };

  const handlePaymentMode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentConsultantId.trim()) {
      setFeedback({ message: 'Please enter a Consultant UID.', ok: false });
      return;
    }
    callApi({ action: 'update_payment_mode', consultant_id: paymentConsultantId.trim(), payment_mode: selectedMode });
  };

  const handleConnectOAuth = async () => {
    if (!paymentConsultantId.trim()) {
      setFeedback({ message: 'Please enter a Consultant UID first.', ok: false });
      return;
    }
    setConnectLoading(true);
    setFeedback(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/stripe/connect/oauth?consultant_id=${encodeURIComponent(paymentConsultantId.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create OAuth URL.');
      window.location.href = data.oauth_url;
    } catch (err: any) {
      setFeedback({ message: err.message || 'An error occurred.', ok: false });
    } finally {
      setConnectLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'pos' || !userEmail) return;

    const loadPosSlots = async () => {
      setPosLoading(true);
      setFeedback(null);
      try {
        const token = await getToken();
        const res = await fetch('/api/admin/pos-settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load POS slots.');
        setPosSlots(data.slots || []);
      } catch (err: any) {
        setFeedback({ message: err.message || 'Failed to load POS slots.', ok: false });
      } finally {
        setPosLoading(false);
      }
    };

    loadPosSlots();
  }, [activeTab, userEmail]);

  const callPosApi = async (body: Record<string, string>) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/pos-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed.');
      setFeedback({ message: data.message || 'Saved.', ok: true });
      if (body.action === 'save_slot' || body.action === 'activate_slot' || body.action === 'delete_slot') {
        const slotsRes = await fetch('/api/admin/pos-settings', { headers: { Authorization: `Bearer ${token}` } });
        const slotsData = await slotsRes.json();
        if (slotsRes.ok) {
          setPosSlots(slotsData.slots || []);
        }
      }
    } catch (err: any) {
      setFeedback({ message: err.message || 'An error occurred.', ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePosSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await callPosApi({
      action: 'save_slot',
      slot_id: posForm.slot_id,
      label: posForm.label,
      publishable_key: posForm.publishable_key,
      secret_key: posForm.secret_key,
      webhook_secret: posForm.webhook_secret,
    });
    setPosForm({ slot_id: '', label: '', publishable_key: '', secret_key: '', webhook_secret: '' });
  };

  const handlePosActivate = async (slotId: string) => {
    await callPosApi({ action: 'activate_slot', slot_id: slotId });
  };

  const handlePosDelete = async (slotId: string) => {
    await callPosApi({ action: 'delete_slot', slot_id: slotId });
  };

  const handlePosEdit = (slot: any) => {
    setPosForm({
      slot_id: slot.id,
      label: slot.label,
      publishable_key: '',
      secret_key: '',
      webhook_secret: '',
    });
  };

  const set = <T extends Record<string, string>>(setter: React.Dispatch<React.SetStateAction<T>>, field: keyof T) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setter((prev) => ({ ...prev, [field]: e.target.value }));

  if (loading) return null;

  if (!userEmail) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Consultant Integrations</h1>
          <p className="mt-3 text-gray-600">Please sign in to access this page.</p>
          <div className="mt-6">
            <a href="/login" className="rounded-full bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">
              Sign In
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Access Denied</h1>
          <p className="mt-3 text-gray-600">This page is only accessible to admin users.</p>
          <div className="mt-6">
            <button type="button" onClick={handleLogout} className="rounded-full bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">
              Sign Out
            </button>
          </div>
        </div>
      </section>
    );
  }

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'payment', label: 'Payment Mode' },
    { id: 'stripe', label: 'Stripe' },
    { id: 'profile', label: 'Profile' },
    { id: 'google', label: 'Calendar' },
    { id: 'outlook', label: 'Outlook' },
    { id: 'pos', label: 'POS Rotation' },
  ];

  return (
    <section className="min-h-screen bg-slate-50 py-20">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Consultant Integrations</h1>
              <p className="mt-1 text-sm text-gray-500">Signed in as: {userEmail}</p>
            </div>
            <div className="flex gap-3">
              <a
                href="/admin"
                className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Admin Panel
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-gray-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setFeedback(null); }}
                className={`flex-shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {feedback && (
            <div className={`mb-4 rounded-2xl p-4 text-sm ${feedback.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {feedback.message}
            </div>
          )}

          {/* Payment Mode Tab */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">
                Select the consultant's payment collection method. Connect or Escrow modes require a Stripe Connect account.
              </p>

              <div>
                <label htmlFor="payment-uid" className="block text-sm font-medium text-gray-700">
                  Consultant UID *
                </label>
                <input
                  id="payment-uid"
                  type="text"
                  value={paymentConsultantId}
                  onChange={(e) => setPaymentConsultantId(e.target.value)}
                  placeholder="firebase-uid…"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <form onSubmit={handlePaymentMode} className="space-y-4">
                <fieldset className="space-y-2">
                  <legend className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</legend>
                  {(Object.entries(paymentModeLabels) as [PaymentMode, string][]).map(([mode, label]) => (
                    <label
                      key={mode}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
                        selectedMode === mode
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_mode"
                        value={mode}
                        checked={selectedMode === mode}
                        onChange={() => setSelectedMode(mode)}
                        className="mt-0.5 accent-primary-600"
                      />
                      <div>
                        <span className="block text-sm font-medium text-gray-900">
                          {mode === 'ki_escrow' && 'Ki Business Escrow'}
                          {mode === 'own_keys' && 'Own API Keys'}
                          {mode === 'ki_connect' && 'Stripe Connect'}
                          {mode === 'direct' && 'Ki Business Direct'}
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5">{label}</span>
                      </div>
                    </label>
                  ))}
                </fieldset>

                <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save Payment Mode'}
                </Button>
              </form>

              {/* Stripe Connect OAuth */}
              {(selectedMode === 'ki_connect' || selectedMode === 'ki_escrow') && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-indigo-900">Stripe Connect Link</h3>
                  {connectAccountId ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm text-gray-700 font-medium">Connected</span>
                      </div>
                      <p className="text-xs text-gray-500 font-mono break-all">{connectAccountId}</p>
                      <button
                        type="button"
                        onClick={handleConnectOAuth}
                        disabled={connectLoading || !paymentConsultantId.trim()}
                        className="mt-2 rounded-xl border border-indigo-400 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                      >
                        {connectLoading ? 'Redirecting…' : 'Reconnect'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-indigo-700">
                        This consultant has not connected a Stripe Connect account yet.
                      </p>
                      <button
                        type="button"
                        onClick={handleConnectOAuth}
                        disabled={connectLoading || !paymentConsultantId.trim()}
                        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {connectLoading ? 'Redirecting…' : 'Connect with Stripe Connect'}
                      </button>
                      {!paymentConsultantId.trim() && (
                        <p className="text-xs text-indigo-500">Enter a Consultant UID first.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stripe Tab */}
          {activeTab === 'stripe' && (
            <form onSubmit={handleStripe} className="space-y-4">
              <p className="text-sm text-gray-500">
                The consultant's <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">users/&lt;uid&gt;</code> document must exist in Firestore.
              </p>
              {(['consultant_id', 'api_key', 'webhook_secret'] as const).map((field) => (
                <div key={field}>
                  <label htmlFor={`stripe-${field}`} className="block text-sm font-medium text-gray-700 capitalize">
                    {field === 'consultant_id' ? 'Consultant UID *' : field === 'api_key' ? 'Stripe Secret Key *' : 'Webhook Secret *'}
                  </label>
                  <input
                    id={`stripe-${field}`}
                    type={field === 'consultant_id' ? 'text' : 'password'}
                    value={stripeForm[field]}
                    onChange={set(setStripeForm, field)}
                    required
                    placeholder={field === 'consultant_id' ? 'firebase-uid…' : field === 'api_key' ? 'sk_live_…' : 'whsec_…'}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              ))}
              <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Stripe Settings'}
              </Button>
            </form>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfile} className="space-y-4">
              <p className="text-sm text-gray-500">
                Profile information shown to clients. This appears on the consultant card in the checkout form.
              </p>
              {[
                { field: 'consultant_id', label: 'Consultant UID *', placeholder: 'firebase-uid…', required: true },
                { field: 'name', label: 'Full Name *', placeholder: 'John Smith', required: true },
                { field: 'title', label: 'Title', placeholder: 'Senior Management Consultant', required: false },
                { field: 'expertise', label: 'Areas of Expertise', placeholder: 'Financial Strategy, Operations, M&A', required: false },
                { field: 'photo_url', label: 'Photo URL', placeholder: 'https://…', required: false },
              ].map(({ field, label, placeholder, required }) => (
                <div key={field}>
                  <label htmlFor={`profile-${field}`} className="block text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  <input
                    id={`profile-${field}`}
                    type={field === 'photo_url' ? 'url' : 'text'}
                    value={profileForm[field as keyof typeof profileForm]}
                    onChange={set(setProfileForm, field as keyof typeof profileForm)}
                    required={required}
                    placeholder={placeholder}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              ))}
              <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                {submitting ? 'Saving…' : 'Update Profile'}
              </Button>
            </form>
          )}

          {/* Calendar Tab */}
          {activeTab === 'google' && (
            <form onSubmit={handleGoogle} className="space-y-4">
              <p className="text-sm text-gray-500">
                Calendar OAuth refresh token and calendar ID. The calendar ID is usually the consultant's email address.
              </p>
              {[
                { field: 'consultant_id', label: 'Consultant UID *', type: 'text', placeholder: 'firebase-uid…' },
                { field: 'refresh_token', label: 'Calendar Refresh Token *', type: 'password', placeholder: '1//…' },
                { field: 'calendar_id', label: 'Calendar ID *', type: 'text', placeholder: 'primary or email@example.com' },
              ].map(({ field, label, type, placeholder }) => (
                <div key={field}>
                  <label htmlFor={`google-${field}`} className="block text-sm font-medium text-gray-700">{label}</label>
                  <input
                    id={`google-${field}`}
                    type={type}
                    value={googleForm[field as keyof typeof googleForm]}
                    onChange={set(setGoogleForm, field as keyof typeof googleForm)}
                    required
                    placeholder={placeholder}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              ))}
              <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                {submitting ? 'Saving…' : 'Connect Calendar'}
              </Button>
            </form>
          )}

          {/* Outlook Calendar Tab */}
          {activeTab === 'outlook' && (
            <form onSubmit={handleOutlook} className="space-y-4">
              <p className="text-sm text-gray-500">
                Microsoft OAuth refresh token. Requires Calendars.ReadWrite permission via an Azure AD application.
              </p>
              {[
                { field: 'consultant_id', label: 'Consultant UID *', type: 'text', placeholder: 'firebase-uid…' },
                { field: 'refresh_token', label: 'Microsoft Refresh Token *', type: 'password', placeholder: 'M.R3_…' },
              ].map(({ field, label, type, placeholder }) => (
                <div key={field}>
                  <label htmlFor={`outlook-${field}`} className="block text-sm font-medium text-gray-700">{label}</label>
                  <input
                    id={`outlook-${field}`}
                    type={type}
                    value={outlookForm[field as keyof typeof outlookForm]}
                    onChange={set(setOutlookForm, field as keyof typeof outlookForm)}
                    required
                    placeholder={placeholder}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              ))}
              <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                {submitting ? 'Saving…' : 'Connect Outlook Calendar'}
              </Button>
            </form>
          )}

          {/* POS Rotation Tab */}
          {activeTab === 'pos' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">
                Manage platform payment keys via Firestore, add new POS slots, and switch the active slot.
              </p>

              <div className="space-y-4 rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-5">
                {posLoading ? (
                  <p className="text-sm text-gray-600">Loading POS slots…</p>
                ) : posSlots.length === 0 ? (
                  <p className="text-sm text-gray-600">No POS slots added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {posSlots.map((slot) => (
                      <div key={slot.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{slot.label}</p>
                            <p className="text-xs text-gray-500">ID: {slot.id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {slot.isActive && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>}
                            <button
                              type="button"
                              onClick={() => handlePosActivate(slot.id)}
                              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                              disabled={submitting}
                            >
                              Activate
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePosEdit(slot)}
                              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePosDelete(slot.id)}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                              disabled={submitting}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handlePosSave} className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label htmlFor="pos-label" className="block text-sm font-medium text-gray-700">Slot Label *</label>
                    <input
                      id="pos-label"
                      type="text"
                      value={posForm.label}
                      onChange={set(setPosForm, 'label')}
                      required
                      placeholder="Primary POS, Backup POS"
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="pos-publishable" className="block text-sm font-medium text-gray-700">Publishable Key *</label>
                    <input
                      id="pos-publishable"
                      type="text"
                      value={posForm.publishable_key}
                      onChange={set(setPosForm, 'publishable_key')}
                      required
                      placeholder="pk_live_..."
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="pos-secret" className="block text-sm font-medium text-gray-700">Secret Key *</label>
                    <input
                      id="pos-secret"
                      type="password"
                      value={posForm.secret_key}
                      onChange={set(setPosForm, 'secret_key')}
                      required
                      placeholder="sk_live_..."
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="pos-webhook" className="block text-sm font-medium text-gray-700">Webhook Secret *</label>
                    <input
                      id="pos-webhook"
                      type="password"
                      value={posForm.webhook_secret}
                      onChange={set(setPosForm, 'webhook_secret')}
                      required
                      placeholder="whsec_..."
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="submit" variant="primary" className="w-full sm:w-auto" disabled={submitting}>
                    {submitting ? 'Saving…' : posForm.slot_id ? 'Update Slot' : 'Save New Slot'}
                  </Button>
                  <p className="text-xs text-gray-500">Each slot can be used for live payments. Activate a slot to choose which Stripe keys the platform uses.</p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
