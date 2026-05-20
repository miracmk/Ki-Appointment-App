'use client';

import { useEffect, useState } from 'react';
import { getFirestoreClient } from '@/lib/firebase-client';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface PlatformSettings {
  stripePublicKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  calendarClientId: string;
  calendarClientSecret: string;
  firebaseProjectId: string;
  platformName: string;
  platformEmail: string;
  supportEmail: string;
  platformFeeBps: number; // basis points (100 = 1%)
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({
    stripePublicKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    calendarClientId: '',
    calendarClientSecret: '',
    firebaseProjectId: '',
    platformName: 'Ki Business',
    platformEmail: 'admin@kibusiness.com',
    supportEmail: 'support@kibusiness.com',
    platformFeeBps: 1000, // 10% default
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const db = getFirestoreClient();
        if (!db) throw new Error('Firestore not available');
        
        const snap = await getDoc(doc(db, 'platform_settings', 'config'));
        if (snap.exists()) {
          setSettings((prev) => ({
            ...prev,
            ...snap.data(),
          }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore not available');
      
      await setDoc(doc(db, 'platform_settings', 'config'), {
        ...settings,
        updatedAt: Date.now(),
      });
      
      setMessage({ type: 'ok', text: 'Platform settings saved successfully!' });
    } catch (err) {
      setMessage({ type: 'err', text: `Error: ${String(err)}` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Platform Settings</h1>
        <p className="text-white/50">Configure Ki Business platform infrastructure and payment processors</p>
      </div>

      {message && (
        <div className={`mb-6 rounded-xl p-4 ${message.type === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Platform Information */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Platform Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Platform Name</label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white focus:border-red-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Platform Email</label>
                <input
                  type="email"
                  value={settings.platformEmail}
                  onChange={(e) => setSettings({ ...settings, platformEmail: e.target.value })}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white focus:border-red-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Support Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white focus:border-red-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Platform Fee (Basis Points)</label>
              <input
                type="number"
                value={settings.platformFeeBps}
                onChange={(e) => setSettings({ ...settings, platformFeeBps: Number(e.target.value) })}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white focus:border-red-400 focus:outline-none"
              />
              <p className="text-xs text-white/40 mt-1">1000 = 10%, 500 = 5%, 1000 = 10%</p>
            </div>
          </div>
        </div>

        {/* Stripe Configuration */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Stripe Configuration</h2>
          <p className="text-sm text-white/50 mb-4">Master Stripe keys for Ki Business escrow payments</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Stripe Public Key</label>
              <input
                type="password"
                value={settings.stripePublicKey}
                onChange={(e) => setSettings({ ...settings, stripePublicKey: e.target.value })}
                placeholder="pk_live_..."
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-red-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Stripe Secret Key</label>
              <input
                type="password"
                value={settings.stripeSecretKey}
                onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                placeholder="sk_live_..."
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-red-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Stripe Webhook Secret</label>
              <input
                type="password"
                value={settings.stripeWebhookSecret}
                onChange={(e) => setSettings({ ...settings, stripeWebhookSecret: e.target.value })}
                placeholder="whsec_..."
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-red-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Calendar OAuth Configuration */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Calendar OAuth Configuration</h2>
          <p className="text-sm text-white/50 mb-4">For calendar integration and video call scheduling</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Calendar Client ID</label>
              <input
                type="text"
                value={settings.calendarClientId}
                onChange={(e) => setSettings({ ...settings, calendarClientId: e.target.value })}
                placeholder="Calendar OAuth Client ID"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-red-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Calendar Client Secret</label>
              <input
                type="password"
                value={settings.calendarClientSecret}
                onChange={(e) => setSettings({ ...settings, calendarClientSecret: e.target.value })}
                placeholder="Calendar OAuth Client Secret"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-red-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Firebase Configuration */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Firebase Configuration</h2>
          <p className="text-sm text-white/50 mb-4">Reference information - actual Firebase setup is done in environment variables</p>
          
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Firebase Project ID</label>
            <input
              type="text"
              value={settings.firebaseProjectId}
              onChange={(e) => setSettings({ ...settings, firebaseProjectId: e.target.value })}
              placeholder="ki-business-xyz"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white placeholder-white/30 focus:border-red-400 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-red-500 px-6 py-3 font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Platform Settings'}
        </button>
      </form>
    </div>
  );
}
