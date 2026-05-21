'use client';

import { useEffect, useRef, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient, getFirebaseStorage } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useSearchParams } from 'next/navigation';
import { useUserRole } from '@/lib/use-user-role';
import type { AppRole } from '@/lib/use-user-role';
import type { WeeklyAvailability, DayAvailability, MarketplaceCategory } from '@/types/marketplace';
import { CATEGORIES, SPECIALTIES } from '@/lib/categories';

// ─── Shared styles ────────────────────────────────────────────────────────────

const INP  = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#00F0FF]/60 focus:outline-none transition';
const SEL  = 'w-full rounded-xl border border-white/10 bg-[#161820] px-4 py-2.5 text-sm text-white focus:border-[#00F0FF]/60 focus:outline-none transition';
const LBL  = 'mb-1.5 block text-xs font-medium text-white/50';
const CARD = 'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4';
const SECTION_TITLE = 'text-sm font-semibold uppercase tracking-wide text-white/70';

// ─── Working Hours constants ──────────────────────────────────────────────────

const DAYS: { key: keyof WeeklyAvailability; label: string }[] = [
  { key: 'monday',    label: 'Monday' },
  { key: 'tuesday',   label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday',  label: 'Thursday' },
  { key: 'friday',    label: 'Friday' },
  { key: 'saturday',  label: 'Saturday' },
  { key: 'sunday',    label: 'Sunday' },
];

const DEFAULT_DAY: DayAvailability = { enabled: false, start: '09:00', end: '18:00' };

const DEFAULT_AVAIL: WeeklyAvailability = {
  monday:    { ...DEFAULT_DAY, enabled: true },
  tuesday:   { ...DEFAULT_DAY, enabled: true },
  wednesday: { ...DEFAULT_DAY, enabled: true },
  thursday:  { ...DEFAULT_DAY, enabled: true },
  friday:    { ...DEFAULT_DAY, enabled: true },
  saturday:  DEFAULT_DAY,
  sunday:    DEFAULT_DAY,
};

// ─── SecretInput ──────────────────────────────────────────────────────────────

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

// ─── ProfilePhoto ─────────────────────────────────────────────────────────────

function ProfilePhoto({ uid, url, onUpload }: {
  uid: string;
  url: string;
  onUpload: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErr('Image must be under 2 MB'); return; }
    setErr(null);
    setUploading(true);
    try {
      const storage = getFirebaseStorage();
      if (!storage) throw new Error('Storage unavailable');
      const photoRef = sRef(storage, `users/${uid}/profile.jpg`);
      await uploadBytes(photoRef, file);
      const downloadUrl = await getDownloadURL(photoRef);
      onUpload(downloadUrl);
    } catch (e) {
      setErr(String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Profile photo" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/20">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z" />
            </svg>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 hover:text-white disabled:opacity-50 transition"
        >
          {uploading ? 'Uploading…' : 'Change Photo'}
        </button>
        <p className="text-xs text-white/25">JPG / PNG · max 2 MB</p>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

// ─── SpecialtiesSelector ──────────────────────────────────────────────────────

function SpecialtiesSelector({ value, onChange }: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [activeCat, setActiveCat] = useState<MarketplaceCategory>(CATEGORIES[0].id);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCat(cat.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeCat === cat.id
                ? 'border border-[#B000FF]/30 bg-[#B000FF]/20 text-[#B000FF]'
                : 'border border-white/[0.08] text-white/40 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className="grid gap-0.5 sm:grid-cols-2">
        {SPECIALTIES[activeCat]?.map((sp) => (
          <label
            key={sp.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-white/[0.03] transition"
          >
            <input
              type="checkbox"
              checked={value.includes(sp.id)}
              onChange={() => toggle(sp.id)}
              className="h-3.5 w-3.5 accent-[#B000FF]"
            />
            <span className="text-xs text-white/70">{sp.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── BlockedDatesCalendar ─────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_ABBR = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function BlockedDatesCalendar({ value, onChange }: {
  value: string[];
  onChange: (dates: string[]) => void;
}) {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const toDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const toggle = (day: number) => {
    const d = toDateStr(day);
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow    = new Date(year, month, 1).getDay();

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={prevMonth}
          className="rounded-lg p-1.5 text-white/40 hover:text-white transition">
          ‹
        </button>
        <span className="text-sm font-medium text-white">{MONTH_NAMES[month]} {year}</span>
        <button type="button" onClick={nextMonth}
          className="rounded-lg p-1.5 text-white/40 hover:text-white transition">
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7">
        {DAY_ABBR.map((d) => (
          <div key={d} className="py-1 text-center text-xs text-white/25">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day     = i + 1;
          const blocked = value.includes(toDateStr(day));
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              className={`rounded-lg py-1.5 text-xs font-medium transition ${
                blocked
                  ? 'border border-red-500/30 bg-red-500/20 text-red-400'
                  : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Profile ─────────────────────────────────────────────────────────────

function TabProfile({ uid, isConsultant }: { uid: string; isConsultant: boolean }) {
  const [form, setForm] = useState({
    displayName: '', language: 'en', birthDate: '', city: '',
    bio: '', title: '', hourlyRate: '', photoUrl: '', specialties: [] as string[],
  });
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
          displayName: d.displayName       ?? '',
          language:    d.language          ?? 'en',
          birthDate:   d.birthDate         ?? '',
          city:        d.city              ?? '',
          bio:         d.bio               ?? '',
          title:       d.title             ?? '',
          hourlyRate:  d.hourly_rate_cents ? String(d.hourly_rate_cents / 100) : '',
          photoUrl:    d.photo_url         ?? '',
          specialties: Array.isArray(d.specialties) ? d.specialties : [],
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
        birthDate:   form.birthDate,
        city:        form.city,
        bio:         form.bio,
        updated_at:  Date.now(),
      };
      if (form.photoUrl) update.photo_url = form.photoUrl;
      if (isConsultant) {
        update.title       = form.title;
        update.specialties = form.specialties;
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
      {/* Photo */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>Profile Photo</h2>
        <ProfilePhoto
          uid={uid}
          url={form.photoUrl}
          onUpload={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
        />
      </div>

      {/* Identity */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>Identity</h2>
        <div>
          <label className={LBL}>Display Name</label>
          <input type="text" value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })} className={INP} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LBL}>Language</label>
            <select value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })} className={SEL}>
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div>
            <label className={LBL}>Date of Birth</label>
            <input type="date" value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className={INP} />
          </div>
        </div>
        <div>
          <label className={LBL}>City</label>
          <input type="text" value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="e.g. Istanbul" className={INP} />
        </div>
        <div>
          <label className={LBL}>
            Bio / Introduction
            <span className="ml-2 text-white/25">{form.bio.length}/500</span>
          </label>
          <textarea
            rows={4}
            value={form.bio}
            maxLength={500}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Tell clients a bit about yourself…"
            className={INP + ' resize-none'}
          />
        </div>
      </div>

      {/* Consultant-only */}
      {isConsultant && (
        <div className={CARD}>
          <h2 className={SECTION_TITLE}>Consultant Profile</h2>
          <div>
            <label className={LBL}>Professional Title</label>
            <input type="text" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Tax Consultant · CPA" className={INP} />
          </div>
          <div>
            <label className={LBL}>Hourly Rate (USD)</label>
            <input type="number" min="0" step="5" value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
              placeholder="150" className={INP} />
          </div>
          <div>
            <label className={LBL}>Specialties</label>
            <SpecialtiesSelector
              value={form.specialties}
              onChange={(ids) => setForm((f) => ({ ...f, specialties: ids }))}
            />
          </div>
        </div>
      )}

      {msg && (
        <div className={`rounded-xl p-3.5 text-sm ${msg.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {msg.text}
        </div>
      )}
      <button type="submit" disabled={saving}
        className="rounded-xl border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-6 py-2.5 text-sm font-semibold text-[#00F0FF] transition hover:bg-[#00F0FF]/20 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Profile'}
      </button>
    </form>
  );
}

// ─── Tab: Working Hours ───────────────────────────────────────────────────────

function TabWorkingHours({ uid }: { uid: string }) {
  const [avail, setAvail]         = useState<WeeklyAvailability>(DEFAULT_AVAIL);
  const [blocked, setBlocked]     = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) return;
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d.availability)    setAvail({ ...DEFAULT_AVAIL, ...d.availability });
        if (Array.isArray(d.blocked_dates)) setBlocked(d.blocked_dates);
      }
    })();
  }, [uid]);

  const updateDay = (day: keyof WeeklyAvailability, field: keyof DayAvailability, value: string | boolean) => {
    setAvail((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore unavailable');
      await setDoc(doc(db, 'users', uid), {
        availability:  avail,
        blocked_dates: blocked,
        updated_at:    Date.now(),
      }, { merge: true });
      setMsg({ ok: true, text: 'Working hours saved.' });
    } catch (err) {
      setMsg({ ok: false, text: String(err) });
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Weekly schedule */}
      <div>
        <h2 className={SECTION_TITLE + ' mb-3'}>Weekly Schedule</h2>
        <p className="mb-3 text-xs text-white/40">Set the hours when clients can book appointments.</p>
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          {DAYS.map((day, i) => {
            const d = avail[day.key];
            return (
              <div
                key={day.key}
                className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}
              >
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
      </div>

      {/* Blocked dates */}
      <div>
        <h2 className={SECTION_TITLE + ' mb-3'}>Blocked Dates</h2>
        <p className="mb-3 text-xs text-white/40">Click a date to block it. Clients cannot book on blocked dates.</p>
        <BlockedDatesCalendar value={blocked} onChange={setBlocked} />
        {blocked.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[...blocked].sort().map((d) => (
              <span key={d} className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                {d}
                <button
                  type="button"
                  onClick={() => setBlocked((prev) => prev.filter((x) => x !== d))}
                  className="hover:text-red-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {msg && (
        <div className={`rounded-xl p-3.5 text-sm ${msg.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {msg.text}
        </div>
      )}
      <button type="submit" disabled={saving}
        className="rounded-xl bg-gradient-to-r from-[#B000FF] to-[#0047FF] px-8 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Working Hours'}
      </button>
    </form>
  );
}

// ─── Tab: Integrations ────────────────────────────────────────────────────────

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
        className="rounded-xl border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-6 py-2.5 text-sm font-semibold text-[#00F0FF] transition hover:bg-[#00F0FF]/20 disabled:opacity-50">
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
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
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
  const [cfg, setCfg]         = useState<PlatformCfg>(PLATFORM_DEFAULTS);
  const [sub, setSub]         = useState<PlatformTab>('identity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null);

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
            className={`border-b-2 px-3 py-2.5 text-sm font-medium transition ${
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
              <p className="mt-1 break-all font-mono text-yellow-400/50">{cfg.appUrl || 'https://your-app.netlify.app'}/api/stripe/webhook</p>
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

type Tab = 'profile' | 'integrations' | 'working_hours' | 'consultants' | 'platform';

export default function SettingsPage() {
  const { user }     = useUserRole();
  const searchParams = useSearchParams();
  const [uid, setUid]     = useState<string | null>(null);
  const [modes, setModes] = useState<string[]>([]);

  const isConsultantTab = modes.includes('consultant') || user?.role === 'consultant' || user?.role === 'admin';
  const isManagement    = user?.role === 'admin' || user?.role === 'supervisor';
  const isAdmin         = user?.role === 'admin';

  const defaultTab = (): Tab => {
    const param = searchParams.get('tab') as Tab | null;
    if (param && ['profile','integrations','working_hours','consultants','platform'].includes(param)) return param;
    return 'profile';
  };
  const [tab, setTab] = useState<Tab>(defaultTab);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUid(u.uid);
      const db = getFirestoreClient();
      if (!db) return;
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (snap.exists()) {
        const data = snap.data();
        setModes(Array.isArray(data.modes) ? data.modes : []);
      }
    });
    return () => unsub();
  }, []);

  const TABS: { id: Tab; label: string; visible: boolean }[] = [
    { id: 'profile',       label: 'Profile',         visible: true },
    { id: 'integrations',  label: 'Integrations',    visible: isConsultantTab || isManagement },
    { id: 'working_hours', label: 'Working Hours',   visible: isConsultantTab },
    { id: 'consultants',   label: 'Consultants',     visible: isManagement },
    { id: 'platform',      label: 'Platform Config', visible: isAdmin },
  ];

  const visibleTabs = TABS.filter((t) => t.visible);

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

      <div className="mb-6 flex flex-wrap gap-1 border-b border-white/[0.06]">
        {visibleTabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
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

      {tab === 'profile'       && <TabProfile uid={uid} isConsultant={isConsultantTab} />}
      {tab === 'integrations'  && (isConsultantTab || isManagement) && <TabIntegrations uid={uid} />}
      {tab === 'working_hours' && isConsultantTab && <TabWorkingHours uid={uid} />}
      {tab === 'consultants'   && isManagement && <TabConsultants />}
      {tab === 'platform'      && isAdmin && <TabPlatform />}
    </div>
  );
}
