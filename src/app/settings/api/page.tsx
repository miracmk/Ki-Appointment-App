'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const VIDEO_PROVIDERS = [
  { id: 'platform', label: 'Use platform video' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'google_meet', label: 'Google Meet' },
];

export default function SettingsApiPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      setUid(user.uid);
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }

      const profileSnap = await getDoc(doc(db, 'consultantProfiles', user.uid));
      if (profileSnap.exists()) {
        const data = profileSnap.data() as { api_keys?: string[] };
        setApiKeys(Array.isArray(data.api_keys) ? data.api_keys : []);
      }

      setWebhookUrl(`${window.location.origin}/api/webhook`);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const generateKey = async () => {
    if (!uid) return;
    setGenerating(true);
    setMessage(null);
    try {
      const key = crypto.randomUUID();
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore unavailable');

      await setDoc(doc(db, 'consultantProfiles', uid), {
        api_keys: [key],
        updated_at: Date.now(),
      }, { merge: true });

      setApiKeys([key]);
      setMessage('API key generated. Store it securely; it will not be visible again.');
    } catch (err) {
      setMessage(String(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">API Access</h1>
        <p className="mt-2 text-sm text-white/50">
          Generate a platform API key and view your webhook integration URL.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">API Key</h2>
        <p className="mt-2 text-sm text-white/50">Your API key is used for the consultant integration endpoints.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            {apiKeys.length > 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#11141B] p-4 text-sm text-white/70">
                <p className="font-mono break-all text-white">{apiKeys[0]}</p>
                <p className="mt-2 text-xs text-white/40">This key will not be shown again after you leave this page.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#11141B] p-4 text-sm text-white/50">
                No API key generated yet.
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={generateKey}
            disabled={generating || !uid}
            className="rounded-2xl bg-ki-gradient px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {generating ? 'Generating…' : apiKeys.length > 0 ? 'Regenerate Key' : 'Generate API Key'}
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#11141B] p-4">
          <p className="text-sm font-semibold text-white">Webhook URL</p>
          <p className="mt-2 break-all text-sm text-white/70">{webhookUrl || 'Loading...'}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(webhookUrl)}
            className="mt-3 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5"
          >
            Copy Webhook URL
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#11141B] p-4">
          <h3 className="text-sm font-semibold text-white">API Documentation</h3>
          <p className="mt-2 text-sm text-white/50">
            Use the key above for consultant API requests. Refer to the API docs for request and webhook formats.
          </p>
          <a
            href="/api-docs"
            className="mt-4 inline-block rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5"
          >
            Open API Docs
          </a>
        </div>

        {message && (
          <p className="mt-4 text-sm text-emerald-400">{message}</p>
        )}
      </div>
    </div>
  );
}
