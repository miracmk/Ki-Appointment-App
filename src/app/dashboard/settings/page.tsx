'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useUserRole } from '@/lib/use-user-role';

type Tab = 'profile' | 'calendar' | 'integrations';
type PaymentMethod = 'ki_escrow' | 'own_key' | 'bank_info';

interface UserSettings {
  displayName: string;
  language: string;
  paymentMethod: PaymentMethod;
  specialties: string[];
  stripePublicKey?: string;
  stripeSecretKey?: string;
  webhookSecret?: string;
  iban?: string;
  bankName?: string;
  bankCountry?: string;
  calendarConnected?: boolean;
  videoCallConnected?: boolean;
}

export default function SettingsPage() {
  const { user } = useUserRole();
  const [uid, setUid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [settings, setSettings] = useState<UserSettings>({
    displayName: '',
    language: 'en',
    paymentMethod: 'ki_escrow',
    specialties: [],
  });
  const [newSpecialty, setNewSpecialty] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setLoading(false);
        return;
      }
      setUid(firebaseUser.uid);
      const db = getFirestoreClient();
      if (!db) {
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          displayName: data.displayName ?? firebaseUser.displayName ?? '',
          language: data.language ?? 'en',
          paymentMethod: data.paymentMethod ?? 'ki_escrow',
          specialties: data.specialties ?? [],
          stripePublicKey: data.stripePublicKey ?? '',
          stripeSecretKey: data.stripeSecretKey ?? '',
          webhookSecret: data.webhookSecret ?? '',
          iban: data.iban ?? '',
          bankName: data.bankName ?? '',
          bankCountry: data.bankCountry ?? '',
          calendarConnected: data.calendarConnected ?? false,
          videoCallConnected: data.videoCallConnected ?? false,
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    setMessage(null);
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore not available');
      await updateDoc(doc(db, 'users', uid), {
        displayName: settings.displayName,
        language: settings.language,
        paymentMethod: settings.paymentMethod,
        specialties: settings.specialties,
        updatedAt: Date.now(),
      });
      setMessage({ type: 'ok', text: 'Profile saved successfully!' });
    } catch (err) {
      setMessage({ type: 'err', text: String(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSpecialty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecialty.trim()) return;
    setSettings({
      ...settings,
      specialties: [...settings.specialties, newSpecialty.trim()],
    });
    setNewSpecialty('');
  };

  const handleRemoveSpecialty = (idx: number) => {
    setSettings({
      ...settings,
      specialties: settings.specialties.filter((_, i) => i !== idx),
    });
  };

  const handleSaveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    setMessage(null);
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore not available');
      
      const updateData: Record<string, any> = {
        paymentMethod: settings.paymentMethod,
        updatedAt: Date.now(),
      };

      if (settings.paymentMethod === 'own_key') {
        updateData.stripePublicKey = settings.stripePublicKey;
        updateData.stripeSecretKey = settings.stripeSecretKey;
        updateData.webhookSecret = settings.webhookSecret;
      } else if (settings.paymentMethod === 'bank_info') {
        updateData.iban = settings.iban;
        updateData.bankName = settings.bankName;
        updateData.bankCountry = settings.bankCountry;
      }

      await updateDoc(doc(db, 'users', uid), updateData);
      setMessage({ type: 'ok', text: 'Integration settings saved!' });
    } catch (err) {
      setMessage({ type: 'err', text: String(err) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-white/50">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-2 border-b border-white/[0.06]">
        {[
          { id: 'profile', label: 'Profile' },
          { id: 'calendar', label: 'Calendar' },
          { id: 'integrations', label: 'Integrations' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === tab.id
                ? 'border-[#00F0FF] text-[#00F0FF]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-6 rounded-xl p-4 ${message.type === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">General Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Display Name</label>
                  <input
                    type="text"
                    value={settings.displayName}
                    onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Language</label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white focus:border-[#00F0FF] focus:outline-none"
                  >
                    <option value="en">English</option>
                    <option value="tr">Türkçe</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Payment Method</label>
                  <select
                    value={settings.paymentMethod}
                    onChange={(e) => setSettings({ ...settings, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white focus:border-[#00F0FF] focus:outline-none"
                  >
                    <option value="ki_escrow">Ki Escrow (Default)</option>
                    <option value="own_key">Own Stripe Keys</option>
                    <option value="bank_info">Bank Information</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Specialties (Uzmanlıklar) - Only for Consultants */}
            {user?.role === 'consultant' && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h2 className="mb-4 text-lg font-semibold text-white">Specialties (Uzmanlıklar)</h2>
                <p className="mb-4 text-sm text-white/50">Adding a new specialty requires KYC approval. Pending specialties are marked and will be activated once approved by admin.</p>

                <form onSubmit={handleAddSpecialty} className="mb-4 flex gap-2">
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="Enter specialty (e.g., Tax Consulting)"
                    className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/30 px-4 py-2 text-sm font-medium text-[#00F0FF] hover:bg-[#00F0FF]/20"
                  >
                    Add
                  </button>
                </form>

                <div className="space-y-2">
                  {settings.specialties.length === 0 ? (
                    <p className="text-sm text-white/40">No specialties added yet</p>
                  ) : (
                    settings.specialties.map((spec, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2">
                        <span className="text-white">{spec}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecialty(idx)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#00F0FF] px-6 py-2.5 font-medium text-black hover:bg-[#00F0FF]/80 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Calendar & Availability</h2>
          <p className="text-white/50">Calendar integration and availability sync coming soon.</p>
          <div className="mt-6 h-64 rounded-lg border border-white/10 bg-white/[0.02] flex items-center justify-center">
            <p className="text-white/30">Calendar UI to be implemented</p>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Payment Integration */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Payment Integration</h2>

            {settings.paymentMethod === 'own_key' && (
              <form onSubmit={handleSaveIntegrations} className="space-y-4">
                <p className="text-sm text-white/50">Connect your Stripe account for direct payments</p>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Stripe Public Key</label>
                  <input
                    type="password"
                    value={settings.stripePublicKey}
                    onChange={(e) => setSettings({ ...settings, stripePublicKey: e.target.value })}
                    placeholder="pk_live_..."
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Stripe Secret Key</label>
                  <input
                    type="password"
                    value={settings.stripeSecretKey}
                    onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                    placeholder="sk_live_..."
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Webhook Secret</label>
                  <input
                    type="password"
                    value={settings.webhookSecret}
                    onChange={(e) => setSettings({ ...settings, webhookSecret: e.target.value })}
                    placeholder="whsec_..."
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#00F0FF] px-6 py-2.5 font-medium text-black hover:bg-[#00F0FF]/80 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Stripe Keys'}
                </button>
              </form>
            )}

            {settings.paymentMethod === 'bank_info' && (
              <form onSubmit={handleSaveIntegrations} className="space-y-4">
                <p className="text-sm text-white/50">Add your bank details for payments</p>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">IBAN</label>
                  <input
                    type="text"
                    value={settings.iban}
                    onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                    placeholder="DE89370400440532013000"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={settings.bankName}
                    onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                    placeholder="Your Bank Name"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Bank Country</label>
                  <input
                    type="text"
                    value={settings.bankCountry}
                    onChange={(e) => setSettings({ ...settings, bankCountry: e.target.value })}
                    placeholder="Turkey"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#00F0FF] px-6 py-2.5 font-medium text-black hover:bg-[#00F0FF]/80 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Bank Details'}
                </button>
              </form>
            )}

            {settings.paymentMethod === 'ki_escrow' && (
              <p className="text-white/50">Using Ki Escrow default payment method. No additional setup required.</p>
            )}
          </div>

          {/* OAuth Integrations */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">OAuth Connections</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <div>
                  <p className="font-medium text-white">Calendar Sync</p>
                  <p className="text-sm text-white/50">Sync your availability with your calendar</p>
                </div>
                <button className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20">
                  {settings.calendarConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <div>
                  <p className="font-medium text-white">Video Calls</p>
                  <p className="text-sm text-white/50">Enable video call integration for sessions</p>
                </div>
                <button className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20">
                  {settings.videoCallConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Link */}
      {(user?.role === 'admin' || user?.role === 'superadmin') && activeTab === 'profile' && (
        <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/5 p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Admin Area</h3>
          <p className="text-white/50 mb-4">Access platform administration and settings</p>
          <Link href="/admin/settings" className="inline-block rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30">
            Go to Admin Settings
          </Link>
        </div>
      )}
    </div>
  );
}
