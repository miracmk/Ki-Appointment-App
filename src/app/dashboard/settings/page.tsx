'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { POPULAR_TIMEZONES } from '@/lib/timezone';

export default function SettingsPage() {
  const [uid, setUid]         = useState<string | null>(null);
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('Europe/Istanbul');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const [saving, setSaving]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [msg, setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pwMsg, setPwMsg]     = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

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
        const data = d.data();
        setName(data.name ?? '');
        setPhone(data.phone ?? '');
        setAddress(data.address ?? '');
        setTimezone(data.timezone ?? 'Europe/Istanbul');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    setMsg(null);
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore bağlantısı yok.');
      await setDoc(doc(db, 'users', uid), { name, phone, address, timezone, updated_at: Date.now() }, { merge: true });
      setMsg({ type: 'ok', text: 'Bilgiler kaydedildi.' });
    } catch {
      setMsg({ type: 'err', text: 'Kayıt sırasında hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) { setPwMsg({ type: 'err', text: 'Şifreler eşleşmiyor.' }); return; }
    if (newPw.length < 6)   { setPwMsg({ type: 'err', text: 'Şifre en az 6 karakter olmalı.' }); return; }
    setPwSaving(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) throw new Error('Oturum yok.');
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPw);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPw);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwMsg({ type: 'ok', text: 'Şifre güncellendi.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Şifre güncellenemedi.';
      setPwMsg({ type: 'err', text: msg.includes('wrong-password') ? 'Mevcut şifre hatalı.' : msg });
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Ayarlar</h1>

      {/* Profile */}
      <form onSubmit={handleSave} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
        <h2 className="font-semibold text-white">Profil Bilgileri</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-name" className="mb-1.5 block text-sm text-white/60">Ad Soyad</label>
            <input id="settings-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-dark w-full" />
          </div>
          <div>
            <label htmlFor="settings-phone" className="mb-1.5 block text-sm text-white/60">Telefon</label>
            <input id="settings-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-dark w-full" placeholder="+90 555 000 00 00" />
          </div>
        </div>

        <div>
          <label htmlFor="settings-address" className="mb-1.5 block text-sm text-white/60">Adres</label>
          <input id="settings-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input-dark w-full" />
        </div>

        <div>
          <label htmlFor="settings-timezone" className="mb-1.5 block text-sm text-white/60">Saat Dilimi</label>
          <select id="settings-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="input-dark w-full">
            {POPULAR_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        {msg && (
          <p className={`text-sm ${msg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
        )}

        <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </form>

      {/* Password */}
      <form onSubmit={handlePasswordChange} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
        <h2 className="font-semibold text-white">Şifre Değiştir</h2>

        <div>
          <label htmlFor="current-pw" className="mb-1.5 block text-sm text-white/60">Mevcut Şifre</label>
          <input id="current-pw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="input-dark w-full" autoComplete="current-password" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new-pw" className="mb-1.5 block text-sm text-white/60">Yeni Şifre</label>
            <input id="new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="input-dark w-full" autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="confirm-pw" className="mb-1.5 block text-sm text-white/60">Şifreyi Onayla</label>
            <input id="confirm-pw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="input-dark w-full" autoComplete="new-password" />
          </div>
        </div>

        {pwMsg && (
          <p className={`text-sm ${pwMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{pwMsg.text}</p>
        )}

        <button type="submit" disabled={pwSaving} className="rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
          {pwSaving ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
        </button>
      </form>
    </div>
  );
}
