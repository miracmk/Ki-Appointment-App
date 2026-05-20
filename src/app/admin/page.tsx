'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, getDocs, query, orderBy, addDoc, getCountFromServer, where,
} from 'firebase/firestore';
import type { FlatAppointment } from '@/types/marketplace';

const MODE_LABEL: Record<string, string> = {
  ki_escrow: 'Escrow', own_keys: 'Own Keys', ki_connect: 'Connect', direct: 'Direct',
};

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  pending:   'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
  completed: 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20',
};

const OB_STYLE: Record<string, string> = {
  form_pending: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  complete:     'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

interface DocItem { id: string; title: string; url: string; packageId: string; userEmail: string }

export default function AdminPage() {
  const [appointments, setAppointments] = useState<(FlatAppointment & { id: string })[]>([]);
  const [documents,    setDocuments]    = useState<DocItem[]>([]);
  const [stats,        setStats]        = useState({ total: 0, kycPending: 0, openTickets: 0 });
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [payoutLoading, setPayoutLoading] = useState<string | null>(null);
  const [payoutFeedback, setPayoutFeedback] = useState<{ id: string; message: string; ok: boolean } | null>(null);
  const [docTitle,   setDocTitle]   = useState('');
  const [docUrl,     setDocUrl]     = useState('');
  const [docPackage, setDocPackage] = useState('starter');
  const [docEmail,   setDocEmail]   = useState('');
  const [docFeedback, setDocFeedback] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setLoading(false); return; }
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }

      const [apptSnap, docsSnap, kycCount, ticketCount] = await Promise.all([
        getDocs(query(collection(db, 'appointments'), orderBy('created_at', 'desc'))),
        getDocs(query(collection(db, 'userDocuments'), orderBy('createdAt', 'desc'))),
        getCountFromServer(query(collection(db, 'kyc_applications'), where('status', '==', 'pending'))),
        getCountFromServer(query(collection(db, 'tickets'), where('status', '==', 'open'))),
      ]);

      const appts = apptSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FlatAppointment, 'id'>) }));
      setAppointments(appts);
      setDocuments(docsSnap.docs.map((d) => ({
        id: d.id, title: d.data().title, url: d.data().url,
        packageId: d.data().packageId, userEmail: d.data().userEmail ?? '',
      })));
      setStats({
        total:      appts.length,
        kycPending: kycCount.data().count,
        openTickets: ticketCount.data().count,
      });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handlePayout = async (appointmentId: string) => {
    setPayoutLoading(appointmentId);
    setPayoutFeedback(null);
    try {
      const auth = getFirebaseAuth();
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error('No active session.');
      const res  = await fetch('/api/admin/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ appointment_id: appointmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payout failed.');
      setPayoutFeedback({ id: appointmentId, message: `Transfer: ${data.transfer_id}`, ok: true });
      setAppointments((prev) =>
        prev.map((a) => a.id === appointmentId ? { ...a, payout_status: 'paid', stripe_transfer_id: data.transfer_id } : a)
      );
    } catch (err: any) {
      setPayoutFeedback({ id: appointmentId, message: err.message, ok: false });
    } finally {
      setPayoutLoading(null);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocFeedback(null);
    const db = getFirestoreClient();
    if (!db) { setDocFeedback('Cannot connect to database.'); return; }
    try {
      await addDoc(collection(db, 'userDocuments'), {
        title: docTitle, url: docUrl, packageId: docPackage,
        userEmail: docEmail, createdAt: new Date().toISOString(),
      });
      setDocFeedback('Document assigned successfully.');
      setDocTitle(''); setDocUrl(''); setDocEmail('');
    } catch {
      setDocFeedback('Failed to assign document.');
    }
  };

  const filtered = filterStatus === 'all'
    ? appointments
    : filterStatus === 'onboarding_pending'
    ? appointments.filter((a) => a.onboarding_status === 'form_pending')
    : appointments.filter((a) => a.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
      </div>
    );
  }

  const revenue = appointments
    .filter((a) => a.status === 'confirmed' || a.status === 'completed')
    .reduce((s, a) => s + (a.payment_amount ?? 0), 0);

  const KPI = [
    { label: 'Total Appointments', value: stats.total,                 color: 'text-white' },
    { label: 'Revenue',            value: `$${(revenue / 100).toLocaleString()}`, color: 'text-emerald-400' },
    { label: 'KYC Pending',        value: stats.kycPending,            color: 'text-yellow-400' },
    { label: 'Open Tickets',       value: stats.openTickets,           color: 'text-[#00F0FF]' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI.map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="mt-1 text-sm text-white/40">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-3">
        {[
          { href: '/admin/consultants', label: 'KYC Approvals' },
          { href: '/admin/tickets',     label: 'Support Tickets' },
          { href: '/admin/settings',    label: 'Platform Settings' },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Appointments */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Appointments</h2>
            <div className="flex flex-wrap gap-2">
              {[
                { v: 'all',               l: 'All' },
                { v: 'confirmed',         l: 'Confirmed' },
                { v: 'pending',           l: 'Pending' },
                { v: 'onboarding_pending', l: 'Form Pending' },
              ].map((f) => (
                <button
                  key={f.v}
                  type="button"
                  onClick={() => setFilterStatus(f.v)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    filterStatus === f.v
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-white/[0.04] px-6">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/30">No appointments for this filter.</p>
            ) : (
              filtered.map((a) => {
                const ss = STATUS_STYLE[a.status] ?? 'bg-white/5 text-white/50';
                const ob = OB_STYLE[a.onboarding_status ?? ''];
                const escrowPending = a.payment_mode === 'ki_escrow' && a.payout_status === 'pending';
                const escrowPaid    = a.payment_mode === 'ki_escrow' && a.payout_status === 'paid';
                return (
                  <div key={a.id} className="py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#00F0FF]">{a.customer_email}</p>
                        {a.customer_name && <p className="text-xs text-white/40">{a.customer_name}</p>}
                        <p className="mt-0.5 font-medium text-white">{a.package_name}</p>
                        {a.consultant_name && <p className="text-xs text-white/40">Consultant: {a.consultant_name}</p>}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-start gap-1.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ss}`}>{a.status}</span>
                        {ob && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ob}`}>{a.onboarding_status}</span>}
                        {a.payment_mode && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/50">
                            {MODE_LABEL[a.payment_mode] ?? a.payment_mode}
                          </span>
                        )}
                        {escrowPaid && (
                          <span className="rounded-full bg-[#00F0FF]/10 px-2.5 py-0.5 text-xs font-semibold text-[#00F0FF]">Paid Out</span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-white/30">
                      ${(a.payment_amount / 100).toLocaleString()} · {a.appointment_time} ·{' '}
                      {new Date(a.appointment_date).toLocaleDateString('en-US', { timeZone: a.appointment_timezone })}
                    </p>
                    {a.platform_fee_cents != null && (
                      <p className="mt-0.5 text-xs text-white/20">
                        Platform fee: ${(a.platform_fee_cents / 100).toFixed(2)} · Payout: ${((a.consultant_payout_cents ?? 0) / 100).toFixed(2)}
                      </p>
                    )}
                    {escrowPending && (
                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={payoutLoading === a.id}
                          onClick={() => handlePayout(a.id)}
                          className="rounded-lg bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          {payoutLoading === a.id ? 'Processing…' : 'Pay Consultant'}
                        </button>
                      </div>
                    )}
                    {payoutFeedback?.id === a.id && (
                      <p className={`mt-2 text-xs ${payoutFeedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                        {payoutFeedback.message}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Assign document */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <h2 className="mb-4 text-base font-semibold text-white">Assign PDF Document</h2>
            <form onSubmit={handleAddDocument} className="space-y-3">
              {([
                { id: 'de', label: 'Client Email',    val: docEmail,   set: setDocEmail,   type: 'email', ph: 'client@email.com' },
                { id: 'dt', label: 'Document Title',  val: docTitle,   set: setDocTitle,   type: 'text',  ph: 'Report Title' },
                { id: 'du', label: 'Document URL',    val: docUrl,     set: setDocUrl,     type: 'url',   ph: 'https://…' },
              ] as { id: string; label: string; val: string; set: (v: string) => void; type: string; ph: string }[]).map((f) => (
                <div key={f.id}>
                  <label htmlFor={f.id} className="mb-1 block text-xs font-medium text-white/60">{f.label}</label>
                  <input
                    id={f.id} type={f.type} required value={f.val}
                    onChange={(e) => f.set(e.target.value)} placeholder={f.ph}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-red-400/50 focus:outline-none"
                  />
                </div>
              ))}
              <div>
                <label htmlFor="dpkg" className="mb-1 block text-xs font-medium text-white/60">Package</label>
                <select
                  id="dpkg" value={docPackage} onChange={(e) => setDocPackage(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0D0E14] px-3 py-2 text-sm text-white focus:border-red-400/50 focus:outline-none"
                >
                  {['starter', 'growth', 'scale', 'executive'].map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-red-500/20 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
              >
                Assign Document
              </button>
            </form>
            {docFeedback && (
              <p className={`mt-3 text-xs ${docFeedback.includes('successfully') ? 'text-emerald-400' : 'text-red-400'}`}>
                {docFeedback}
              </p>
            )}
          </div>

          {/* Assigned docs list */}
          {documents.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
              <h2 className="mb-4 text-base font-semibold text-white">Assigned Documents</h2>
              <div className="space-y-2">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{d.title}</p>
                      <p className="truncate text-xs text-white/30">{d.userEmail || 'All'} · {d.packageId}</p>
                    </div>
                    <a
                      href={d.url} target="_blank" rel="noreferrer"
                      className="shrink-0 rounded-lg bg-white/5 px-3 py-1 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
