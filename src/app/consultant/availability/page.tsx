'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { WeeklyAvailability, DayAvailability } from '@/types/marketplace';

const DAYS: { key: keyof WeeklyAvailability; label: string }[] = [
  { key: 'monday',    label: 'Monday' },
  { key: 'tuesday',  label: 'Tuesday' },
  { key: 'wednesday',label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday',   label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday',   label: 'Sunday' },
];

const DEFAULT_DAY: DayAvailability = { enabled: false, start: '09:00', end: '18:00' };

const DEFAULT_AVAIL: WeeklyAvailability = {
  monday: { ...DEFAULT_DAY, enabled: true },
  tuesday: { ...DEFAULT_DAY, enabled: true },
  wednesday: { ...DEFAULT_DAY, enabled: true },
  thursday: { ...DEFAULT_DAY, enabled: true },
  friday: { ...DEFAULT_DAY, enabled: true },
  saturday: DEFAULT_DAY,
  sunday: DEFAULT_DAY,
};

export default function AvailabilityPage() {
  const [uid, setUid]             = useState<string | null>(null);
  const [avail, setAvail]         = useState<WeeklyAvailability>(DEFAULT_AVAIL);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); return; }
      setUid(user.uid);
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const d = await getDoc(doc(db, 'users', user.uid));
      if (d.exists() && d.data().availability) {
        setAvail({ ...DEFAULT_AVAIL, ...d.data().availability });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateDay = (day: keyof WeeklyAvailability, field: keyof DayAvailability, value: string | boolean) => {
    setAvail((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setSaving(true);
    setMsg(null);
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error();
      await setDoc(doc(db, 'users', uid), { availability: avail, updated_at: Date.now() }, { merge: true });
      setMsg({ type: 'ok', text: 'Availability saved successfully.' });
    } catch {
      setMsg({ type: 'err', text: 'An error occurred while saving.' });
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
      <h1 className="mb-2 text-2xl font-bold text-white">Availability Hours</h1>
      <p className="mb-6 text-white/50">Set the time slots when clients can book appointments with you.</p>

      <form onSubmit={handleSave}>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
          {DAYS.map((day, i) => {
            const d = avail[day.key];
            return (
              <div key={day.key} className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}>
                <div className="flex w-32 shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateDay(day.key, 'enabled', !d.enabled)}
                    className={`relative h-5 w-9 rounded-full transition ${d.enabled ? 'bg-[#B000FF]' : 'bg-white/10'}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${d.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className={`text-sm font-medium ${d.enabled ? 'text-white' : 'text-white/30'}`}>{day.label}</span>
                </div>
                {d.enabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={d.start}
                      onChange={(e) => updateDay(day.key, 'start', e.target.value)}
                      aria-label={`${day.label} start time`}
                      className="input-dark w-28 text-sm"
                    />
                    <span className="text-white/30">—</span>
                    <input
                      type="time"
                      value={d.end}
                      onChange={(e) => updateDay(day.key, 'end', e.target.value)}
                      aria-label={`${day.label} end time`}
                      className="input-dark w-28 text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {msg && <p className={`mt-4 text-sm ${msg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}

        <button type="submit" disabled={saving} className="mt-5 rounded-xl bg-gradient-to-r from-[#B000FF] to-[#0047FF] px-8 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Availability'}
        </button>
      </form>
    </div>
  );
}
