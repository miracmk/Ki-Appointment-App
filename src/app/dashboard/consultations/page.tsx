'use client';

import { useEffect, useRef, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs,
  query, updateDoc, where,
} from 'firebase/firestore';
import { useUserRole } from '@/lib/use-user-role';
import { CATEGORIES, SPECIALTIES, getCategoryLabel } from '@/lib/categories';
import type { MarketplaceCategory } from '@/types/marketplace';
import type {
  ConsultantListing, ListingCurrency, ListingPaymentMethod,
  ListingPricing, PricingType, ReferenceCase,
} from '@/types/marketplace';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  hourly:           'Hourly Rate',
  per_session:      'Per Session',
  monthly_retainer: 'Monthly Retainer',
  yearly_retainer:  'Yearly Retainer',
  project_based:    'Project-Based',
  package:          'Session Package',
};

const CURRENCY_SYMBOLS: Record<ListingCurrency, string> = {
  usd: '$', eur: '€', gbp: '£', try: '₺',
};

const CATEGORY_COLORS: Record<string, string> = {
  accounting_tax:       'border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF]',
  law_corporate:        'border-[#B000FF]/30 bg-[#B000FF]/10 text-[#B000FF]',
  immigration_visa:     'border-[#0047FF]/30 bg-[#0047FF]/10 text-blue-400',
  financial_investment: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  customs_trade:        'border-orange-500/30 bg-orange-500/10 text-orange-400',
  trademark_ip:         'border-pink-500/30 bg-pink-500/10 text-pink-400',
};

const INP  = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#00F0FF]/60 focus:outline-none transition';
const LBL  = 'mb-1.5 block text-xs font-medium text-white/50';

// ─── Empty form state ─────────────────────────────────────────────────────────

function emptyListing(): Omit<ConsultantListing, 'id' | 'consultant_id' | 'consultant_name' | 'created_at' | 'updated_at'> {
  return {
    category:       'accounting_tax',
    specialty_id:   '',
    specialty_label:'',
    title:          '',
    description:    '',
    references:     [],
    is_active:      true,
    pricing: {
      type:            'hourly',
      amount_cents:    15000,
      currency:        'usd',
      hours_included:  undefined,
      sessions_included: undefined,
      custom_note:     '',
      payment_methods: ['card'],
    },
  };
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

function ListingCard({
  listing, onEdit, onToggle, onDelete,
}: {
  listing: ConsultantListing;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const sym = CURRENCY_SYMBOLS[listing.pricing.currency];
  const amt = listing.pricing.amount_cents / 100;

  return (
    <div className={`rounded-2xl border p-5 transition ${listing.is_active ? 'border-white/[0.08] bg-white/[0.03]' : 'border-white/[0.04] bg-white/[0.01] opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Category + specialty badges */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[listing.category] ?? 'border-white/10 bg-white/5 text-white/50'}`}>
              {getCategoryLabel(listing.category as MarketplaceCategory)}
            </span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/50">
              {listing.specialty_label}
            </span>
          </div>

          <h3 className="truncate font-semibold text-white">{listing.title || '(Untitled)'}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-white/40">{listing.description}</p>

          {/* Pricing */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-bold text-white">
              {sym}{amt.toLocaleString()}
              <span className="ml-1 text-xs font-normal text-white/40">
                / {PRICING_TYPE_LABELS[listing.pricing.type]}
              </span>
            </span>
            {listing.pricing.hours_included && (
              <span className="text-xs text-white/30">· {listing.pricing.hours_included}h included</span>
            )}
            {listing.pricing.sessions_included && (
              <span className="text-xs text-white/30">· {listing.pricing.sessions_included} sessions</span>
            )}
          </div>

          {/* Payment methods */}
          <div className="mt-1.5 flex gap-1.5">
            {listing.pricing.payment_methods.map((m) => (
              <span key={m} className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/30 capitalize">
                {m === 'card' ? 'Card' : 'Bank Transfer'}
              </span>
            ))}
          </div>

          {/* References count */}
          {listing.references.length > 0 && (
            <p className="mt-2 text-xs text-white/30">
              {listing.references.length} reference {listing.references.length === 1 ? 'case' : 'cases'}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-1.5">
          <button type="button" onClick={onEdit}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white">
            Edit
          </button>
          <button type="button" onClick={onToggle}
            className={`rounded-lg border px-3 py-1.5 text-xs transition ${
              listing.is_active
                ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}>
            {listing.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button type="button" onClick={onDelete}
            className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/20">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reference case editor ────────────────────────────────────────────────────

function ReferencesEditor({
  value, onChange,
}: {
  value: ReferenceCase[];
  onChange: (refs: ReferenceCase[]) => void;
}) {
  const [draft, setDraft] = useState<ReferenceCase>({ title: '', description: '', outcome: '' });

  const add = () => {
    if (!draft.title.trim() || !draft.description.trim()) return;
    onChange([...value, { ...draft }]);
    setDraft({ title: '', description: '', outcome: '' });
  };

  return (
    <div className="space-y-3">
      {value.map((ref, i) => (
        <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{ref.title}</p>
              <p className="mt-0.5 text-xs text-white/50">{ref.description}</p>
              {ref.outcome && <p className="mt-0.5 text-xs text-emerald-400/70">Outcome: {ref.outcome}</p>}
            </div>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="text-xs text-red-400/60 hover:text-red-400">✕</button>
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-3 space-y-2">
        <p className="text-xs font-medium text-white/40">Add reference case</p>
        <input type="text" placeholder="Case title *" value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/20 focus:border-[#00F0FF]/40 focus:outline-none" />
        <textarea placeholder="Brief description of the engagement *" rows={2} value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/20 focus:border-[#00F0FF]/40 focus:outline-none" />
        <input type="text" placeholder="Outcome / result (optional)" value={draft.outcome ?? ''}
          onChange={(e) => setDraft({ ...draft, outcome: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/20 focus:border-[#00F0FF]/40 focus:outline-none" />
        <button type="button" onClick={add}
          className="rounded-lg border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-3 py-1.5 text-xs text-[#00F0FF] transition hover:bg-[#00F0FF]/20">
          + Add
        </button>
      </div>
    </div>
  );
}

// ─── Listing Form (slide-in panel) ───────────────────────────────────────────

function ListingForm({
  initialData, allowedCategories, onSave, onCancel, saving,
}: {
  initialData: Omit<ConsultantListing, 'id' | 'consultant_id' | 'consultant_name' | 'created_at' | 'updated_at'>;
  allowedCategories: MarketplaceCategory[];
  onSave: (data: typeof initialData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initialData);

  const setCategory = (cat: MarketplaceCategory) =>
    setForm((f) => ({ ...f, category: cat, specialty_id: '', specialty_label: '' }));

  const setSpecialty = (id: string) => {
    const label = (SPECIALTIES[form.category] ?? []).find((s) => s.id === id)?.label ?? id;
    setForm((f) => ({ ...f, specialty_id: id, specialty_label: label }));
  };

  const setPricing = (patch: Partial<ListingPricing>) =>
    setForm((f) => ({ ...f, pricing: { ...f.pricing, ...patch } }));

  const togglePayment = (method: ListingPaymentMethod) => {
    const current = form.pricing.payment_methods;
    const next = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method];
    if (next.length === 0) return; // at least one required
    setPricing({ payment_methods: next });
  };

  const needsHours    = form.pricing.type === 'monthly_retainer' || form.pricing.type === 'yearly_retainer';
  const needsSessions = form.pricing.type === 'package';

  const availableCats = allowedCategories.length > 0 ? allowedCategories : CATEGORIES.map((c) => c.id);

  return (
    <div className="space-y-5">
      {/* ── Section 1: Consulting Area ─────────────────── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Consulting Area</h3>

        <div>
          <label htmlFor="lf-category" className={LBL}>Consulting Topic *</label>
          <select id="lf-category" value={form.category}
            onChange={(e) => setCategory(e.target.value as MarketplaceCategory)}
            className={INP}>
            {availableCats.map((catId) => {
              const meta = CATEGORIES.find((c) => c.id === catId);
              return <option key={catId} value={catId}>{meta?.icon} {meta?.label ?? catId}</option>;
            })}
          </select>
          <p className="mt-1.5 text-xs text-white/25">
            {CATEGORIES.find((c) => c.id === form.category)?.description}
          </p>
        </div>

        <div>
          <label htmlFor="lf-specialty" className={LBL}>Specialty *</label>
          <select id="lf-specialty" value={form.specialty_id}
            onChange={(e) => setSpecialty(e.target.value)}
            className={INP}>
            <option value="">— Select specialty —</option>
            {(SPECIALTIES[form.category] ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Section 2: Listing Details ─────────────────── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Listing Details</h3>

        <div>
          <label htmlFor="lf-title" className={LBL}>Listing Title *</label>
          <input id="lf-title" type="text" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. US H-1B Visa Application Consulting"
            className={INP} />
        </div>

        <div>
          <label htmlFor="lf-desc" className={LBL}>Expertise Description *</label>
          <textarea id="lf-desc" rows={5} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Introduce yourself and describe your expertise in this area. What makes you the right consultant for this? What results do you deliver?"
            className={INP + ' resize-none'} />
        </div>
      </div>

      {/* ── Section 3: References ──────────────────────── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Previous Work & References</h3>
          <p className="mt-1 text-xs text-white/30">Add real-world cases (anonymised) to build trust. Describe the challenge, your approach, and the outcome.</p>
        </div>
        <ReferencesEditor value={form.references} onChange={(refs) => setForm({ ...form, references: refs })} />
      </div>

      {/* ── Section 4: Pricing ─────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Pricing & Payment</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lf-pricing-type" className={LBL}>Pricing Type *</label>
            <select id="lf-pricing-type" value={form.pricing.type}
              onChange={(e) => setPricing({ type: e.target.value as PricingType })}
              className={INP}>
              {(Object.entries(PRICING_TYPE_LABELS) as [PricingType, string][]).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lf-currency" className={LBL}>Currency</label>
            <select id="lf-currency" value={form.pricing.currency}
              onChange={(e) => setPricing({ currency: e.target.value as ListingCurrency })}
              className={INP}>
              <option value="usd">USD — US Dollar</option>
              <option value="eur">EUR — Euro</option>
              <option value="gbp">GBP — British Pound</option>
              <option value="try">TRY — Turkish Lira</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="lf-amount" className={LBL}>
            Amount ({CURRENCY_SYMBOLS[form.pricing.currency]}) *
            <span className="ml-1 text-white/20">
              — per {PRICING_TYPE_LABELS[form.pricing.type].toLowerCase()}
            </span>
          </label>
          <input id="lf-amount" type="number" min="0" step="5"
            value={form.pricing.amount_cents / 100}
            onChange={(e) => setPricing({ amount_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
            className={INP} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {needsHours && (
            <div>
              <label htmlFor="lf-hours" className={LBL}>Hours Included per Period</label>
              <input id="lf-hours" type="number" min="1" step="1"
                value={form.pricing.hours_included ?? ''}
                onChange={(e) => setPricing({ hours_included: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="e.g. 10" className={INP} />
            </div>
          )}
          {needsSessions && (
            <div>
              <label htmlFor="lf-sessions" className={LBL}>Sessions in Package</label>
              <input id="lf-sessions" type="number" min="1" step="1"
                value={form.pricing.sessions_included ?? ''}
                onChange={(e) => setPricing({ sessions_included: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="e.g. 5" className={INP} />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="lf-note" className={LBL}>Custom Pricing Note <span className="text-white/20">(optional)</span></label>
          <input id="lf-note" type="text" value={form.pricing.custom_note ?? ''}
            onChange={(e) => setPricing({ custom_note: e.target.value })}
            placeholder='e.g. "Price includes 2 revision rounds and a final report"'
            className={INP} />
        </div>

        <div>
          <p className={LBL}>Accepted Payment Methods *</p>
          <div className="flex gap-3">
            {(['card', 'bank_transfer'] as ListingPaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => togglePayment(m)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  form.pricing.payment_methods.includes(m)
                    ? 'border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF]'
                    : 'border-white/10 bg-white/5 text-white/40 hover:text-white'
                }`}
              >
                {m === 'card' ? '💳 Card (Stripe)' : '🏦 Bank Transfer'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Actions ─────────────────────────────────────── */}
      <div className="flex gap-3">
        <button type="button" onClick={() => onSave(form)} disabled={saving || !form.specialty_id || !form.title.trim()}
          className="flex-1 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 py-3 text-sm font-semibold text-[#00F0FF] transition hover:bg-[#00F0FF]/20 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Listing'}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/50 transition hover:text-white">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Consultant view ──────────────────────────────────────────────────────────

function ConsultantListingsView({ uid, displayName }: { uid: string; displayName?: string | null }) {
  const [listings, setListings]         = useState<ConsultantListing[]>([]);
  const [loading, setLoading]           = useState(true);
  const [editingId, setEditingId]       = useState<string | 'new' | null>(null);
  const [saving, setSaving]             = useState(false);
  const [allowedCats, setAllowedCats]   = useState<MarketplaceCategory[]>([]);
  const [filterCat, setFilterCat]       = useState<string>('all');
  const formRef = useRef<HTMLDivElement>(null);

  // Draft for current edit
  const [draft, setDraft] = useState<ReturnType<typeof emptyListing>>(emptyListing());

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }

      const [listingSnap, userSnap] = await Promise.all([
        getDocs(query(collection(db, 'consultant_listings'), where('consultant_id', '==', uid))),
        getDoc(doc(db, 'users', uid)),
      ]);

      setListings(listingSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ConsultantListing, 'id'>) }))
        .sort((a, b) => b.created_at - a.created_at));

      if (userSnap.exists()) {
        setAllowedCats((userSnap.data().categories ?? []) as MarketplaceCategory[]);
      }
      setLoading(false);
    })();
  }, [uid]);

  const openNew = () => {
    setDraft(emptyListing());
    setEditingId('new');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const openEdit = (listing: ConsultantListing) => {
    setDraft({
      category:       listing.category,
      specialty_id:   listing.specialty_id,
      specialty_label:listing.specialty_label,
      title:          listing.title,
      description:    listing.description,
      references:     listing.references ?? [],
      pricing:        listing.pricing,
      is_active:      listing.is_active,
    });
    setEditingId(listing.id);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSave = async (data: ReturnType<typeof emptyListing>) => {
    setSaving(true);
    try {
      const db = getFirestoreClient();
      if (!db) throw new Error('Firestore unavailable');

      if (editingId === 'new') {
        const docRef = await addDoc(collection(db, 'consultant_listings'), {
          ...data, consultant_id: uid, consultant_name: displayName ?? '',
          created_at: Date.now(), updated_at: Date.now(),
        });
        setListings((prev) => [{
          id: docRef.id, consultant_id: uid, consultant_name: displayName ?? '',
          ...data, created_at: Date.now(), updated_at: Date.now(),
        }, ...prev]);
      } else if (editingId) {
        await updateDoc(doc(db, 'consultant_listings', editingId), {
          ...data, updated_at: Date.now(),
        });
        setListings((prev) => prev.map((l) =>
          l.id === editingId ? { ...l, ...data, updated_at: Date.now() } : l
        ));
      }
      setEditingId(null);
    } finally { setSaving(false); }
  };

  const handleToggle = async (listing: ConsultantListing) => {
    const db = getFirestoreClient();
    if (!db) return;
    await updateDoc(doc(db, 'consultant_listings', listing.id), {
      is_active: !listing.is_active, updated_at: Date.now(),
    });
    setListings((prev) => prev.map((l) =>
      l.id === listing.id ? { ...l, is_active: !l.is_active } : l
    ));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing permanently?')) return;
    const db = getFirestoreClient();
    if (!db) return;
    await deleteDoc(doc(db, 'consultant_listings', id));
    setListings((prev) => prev.filter((l) => l.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const visibleListings = listings.filter((l) => filterCat === 'all' || l.category === filterCat);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Listings</h1>
          <p className="mt-1 text-sm text-white/40">
            Create and manage your consulting service listings on the marketplace.
          </p>
        </div>
        {editingId === null && (
          <button type="button" onClick={openNew}
            className="shrink-0 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 px-4 py-2 text-sm font-semibold text-[#00F0FF] transition hover:bg-[#00F0FF]/20">
            + New Listing
          </button>
        )}
      </div>

      {/* Category filter */}
      {listings.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilterCat('all')}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${filterCat === 'all' ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-white/5 text-white/40 hover:text-white'}`}>
            All ({listings.length})
          </button>
          {CATEGORIES.filter((c) => listings.some((l) => l.category === c.id)).map((c) => (
            <button key={c.id} type="button" onClick={() => setFilterCat(c.id)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                filterCat === c.id
                  ? `${CATEGORY_COLORS[c.id]} border-current`
                  : 'border-white/10 bg-white/5 text-white/40 hover:text-white'
              }`}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
        </div>
      ) : visibleListings.length === 0 && editingId === null ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-white/50 font-medium">No listings yet</p>
          <p className="mt-1 text-sm text-white/30">Create your first consulting listing to appear on the marketplace.</p>
          <button type="button" onClick={openNew}
            className="mt-4 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/20 px-5 py-2.5 text-sm font-semibold text-[#00F0FF] transition hover:bg-[#00F0FF]/20">
            + Create Listing
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onEdit={() => openEdit(listing)}
              onToggle={() => handleToggle(listing)}
              onDelete={() => handleDelete(listing.id)}
            />
          ))}
        </div>
      )}

      {/* Form panel */}
      {editingId !== null && (
        <div ref={formRef} className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {editingId === 'new' ? 'Create New Listing' : 'Edit Listing'}
            </h2>
            <button type="button" onClick={() => setEditingId(null)}
              className="text-sm text-white/30 hover:text-white">✕ Close</button>
          </div>
          <ListingForm
            initialData={draft}
            allowedCategories={allowedCats}
            onSave={handleSave}
            onCancel={() => setEditingId(null)}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}

// ─── Client / Management view (their consultation engagements) ────────────────

function EngagementsView({ uid, email, role }: { uid: string; email: string; role: string }) {
  const [listings, setListings] = useState<ConsultantListing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const snap = role === 'admin' || role === 'supervisor'
        ? await getDocs(collection(db, 'consultant_listings'))
        : await getDocs(query(collection(db, 'consultant_listings'), where('is_active', '==', true)));
      setListings(snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ConsultantListing, 'id'>) }))
        .sort((a, b) => b.created_at - a.created_at));
      setLoading(false);
    })();
  }, [uid, role]);

  const filtered = listings.filter((l) =>
    !search ||
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.specialty_label.toLowerCase().includes(search.toLowerCase()) ||
    getCategoryLabel(l.category as MarketplaceCategory).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace Listings</h1>
          <p className="mt-1 text-sm text-white/40">
            {role === 'admin' || role === 'supervisor'
              ? 'All active consultant listings on the platform.'
              : 'Browse active consulting services available to you.'}
          </p>
        </div>
        <input type="text" placeholder="Search listings…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#00F0FF]/50 focus:outline-none" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-16 text-center">
          <p className="text-white/40">No listings found.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((l) => {
            const sym = CURRENCY_SYMBOLS[l.pricing.currency];
            const amt = l.pricing.amount_cents / 100;
            return (
              <div key={l.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[l.category] ?? 'border-white/10 bg-white/5 text-white/50'}`}>
                    {getCategoryLabel(l.category as MarketplaceCategory)}
                  </span>
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/50">
                    {l.specialty_label}
                  </span>
                  {(role === 'admin' || role === 'supervisor') && !l.is_active && (
                    <span className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs text-red-400">
                      Inactive
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-white">{l.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-white/40">{l.description}</p>
                {l.consultant_name && (
                  <p className="mt-2 text-xs text-white/30">by {l.consultant_name}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">{sym}{amt.toLocaleString()}</span>
                    <span className="ml-1 text-xs text-white/30">/ {PRICING_TYPE_LABELS[l.pricing.type]}</span>
                  </div>
                  <a href={`/marketplace`}
                    className="rounded-lg border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-3 py-1.5 text-xs text-[#00F0FF] transition hover:bg-[#00F0FF]/20">
                    View
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConsultationsPage() {
  const { user } = useUserRole();
  const [uid, setUid]     = useState<string | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setEmail(u?.email ?? '');
    });
    return () => unsub();
  }, []);

  if (!uid || !user) return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
    </div>
  );

  if (user.role === 'consultant') {
    return <ConsultantListingsView uid={uid} displayName={user.displayName} />;
  }

  return <EngagementsView uid={uid} email={email} role={user.role} />;
}
