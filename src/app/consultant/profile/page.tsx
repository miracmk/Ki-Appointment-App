'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CATEGORIES } from '@/lib/categories';
import { POPULAR_TIMEZONES } from '@/lib/timezone';
import type { ConsultantProfile, MarketplaceCategory } from '@/types/marketplace';

const LANGUAGES = ['Türkçe', 'İngilizce', 'Almanca', 'Fransızca', 'Arapça', 'İspanyolca', 'Rusça', 'Çince'];

export default function ConsultantProfilePage() {
  const [uid, setUid]         = useState<string | null>(null);
  const [name, setName]       = useState('');
  const [title, setTitle]     = useState('');
  const [bio, setBio]         = useState('');
  const [location, setLocation] = useState('');
  const [timezone, setTimezone] = useState('Europe/Istanbul');
  const [rate, setRate]       = useState('');
  const [langs, setLangs]     = useState<string[]>([]);
  const [cats, setCats]       = useState<MarketplaceCategory[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      setUid(user.uid);
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const d = await getDoc(doc(db, 'users', user.uid));
      if (d.exists()) {
        const p = d.data() as ConsultantProfile;
        setName(p.name ?? '');
        setTitle(p.title ?? '');
        setBio(p.bio ?? '');
        setLocation(p.location ?? '');
        setTimezone(p.timezone ?? 'Europe/Istanbul');
        setRate(p.hourly_rate_cents ? String(p.hourly_rate_cents / 100) : '');
        setLangs(p.languages ?? []);
        setCats((p.categories ?? []) as MarketplaceCategory[]);
        setPhotoUrl(p.photo_url ?? '');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleLang = (l: string) => setLangs((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);
  const toggleCat  = (c: MarketplaceCategory) => setCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    setMsg(null);
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore bağlantısı yok.');
      await setDoc(doc(db, 'users', uid), {
        name, title, bio, location, timezone,
        hourly_rate_cents: Number(rate) * 100 || 0,
        languages: langs,
        categories: cats,
        photo_url: photoUrl,
        updated_at: Date.now(),
      }, { merge: true });
      setMsg({ type: 'ok', text: 'Profil kaydedildi.' });
    } catch {
      setMsg({ type: 'err', text: 'Kayıt sırasında hata oluştu.' });
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

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Profilimi Düzenle</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic info */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
          <h2 className="font-semibold text-white">Temel Bilgiler</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="mb-1.5 block text-sm text-white/60">Ad Soyad *</label>
              <input id="c-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input-dark w-full" />
            </div>
            <div>
              <label htmlFor="c-title" className="mb-1.5 block text-sm text-white/60">Unvan</label>
              <input id="c-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ör: Kurumsal Vergi Uzmanı" className="input-dark w-full" />
            </div>
            <div>
              <label htmlFor="c-location" className="mb-1.5 block text-sm text-white/60">Konum</label>
              <input id="c-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="İstanbul, Türkiye" className="input-dark w-full" />
            </div>
            <div>
              <label htmlFor="c-rate" className="mb-1.5 block text-sm text-white/60">Saatlik Ücret (USD)</label>
              <input id="c-rate" type="number" value={rate} onChange={(e) => setRate(e.target.value)} min="0" placeholder="150" className="input-dark w-full" />
            </div>
            <div>
              <label htmlFor="c-timezone" className="mb-1.5 block text-sm text-white/60">Saat Dilimi</label>
              <select id="c-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="input-dark w-full">
                {POPULAR_TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="c-photo" className="mb-1.5 block text-sm text-white/60">Fotoğraf URL</label>
              <input id="c-photo" type="url" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." className="input-dark w-full" />
            </div>
          </div>
          <div>
            <label htmlFor="c-bio" className="mb-1.5 block text-sm text-white/60">Hakkında</label>
            <textarea id="c-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Kendinizi tanıtın…" className="input-dark w-full resize-none" />
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-3">
          <h2 className="font-semibold text-white">Kategoriler</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <label key={cat.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition ${cats.includes(cat.id) ? 'border-[#B000FF]/50 bg-[#B000FF]/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}>
                <input type="checkbox" checked={cats.includes(cat.id)} onChange={() => toggleCat(cat.id)} className="sr-only" />
                <span>{cat.icon}</span>
                <span className={`text-xs font-medium ${cats.includes(cat.id) ? 'text-[#B000FF]' : 'text-white/50'}`}>{cat.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-3">
          <h2 className="font-semibold text-white">Diller</h2>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => toggleLang(l)}
                className={`rounded-xl border px-3 py-1.5 text-sm transition ${langs.includes(l) ? 'border-[#B000FF]/50 bg-[#B000FF]/10 text-[#B000FF]' : 'border-white/10 bg-white/5 text-white/50 hover:text-white'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {msg && <p className={`text-sm ${msg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}

        <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-[#B000FF] to-[#0047FF] px-8 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
          {saving ? 'Kaydediliyor…' : 'Profili Kaydet'}
        </button>
      </form>
    </div>
  );
}
