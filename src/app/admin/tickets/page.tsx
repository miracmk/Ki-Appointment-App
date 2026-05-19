'use client';

import { useEffect, useState } from 'react';
import { getFirestoreClient } from '@/lib/firebase-client';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { Ticket } from '@/types/marketplace';

const STATUS_STYLES: Record<string, string> = {
  open:        'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/20',
  in_progress: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  resolved:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  closed:      'bg-white/5 text-white/30 border-white/10',
};
const PRIORITY_STYLES: Record<string, string> = {
  low:    'text-white/40', medium: 'text-yellow-400',
  high:   'text-orange-400', urgent: 'text-red-400',
};
const STATUS_LABELS: Record<string, string> = { open: 'Açık', in_progress: 'İşlemde', resolved: 'Çözüldü', closed: 'Kapalı' };

export default function AdminTicketsPage() {
  const [tickets, setTickets]     = useState<(Ticket & { id: string })[]>([]);
  const [selected, setSelected]   = useState<(Ticket & { id: string }) | null>(null);
  const [reply, setReply]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    (async () => {
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }
      const snap = await getDocs(query(collection(db, 'tickets'), orderBy('created_at', 'desc')));
      setTickets(
        snap.docs.map((d) => {
          const ticket = d.data() as Ticket;
          const { id, ...ticketData } = ticket as Ticket;
          return { id: d.id, ...ticketData };
        })
      );
      setLoading(false);
    })();
  }, []);

  const handleReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply, role: 'admin' }),
      });
      if (res.ok) {
        const newMsg = { id: Date.now().toString(), sender_uid: 'admin', sender_name: 'Admin', sender_role: 'admin' as const, content: reply, created_at: Date.now() };
        const updated = { ...selected, messages: [...(selected.messages ?? []), newMsg] };
        setSelected(updated);
        setTickets((prev) => prev.map((t) => t.id === selected.id ? updated : t));
        setReply('');
      }
    } finally { setSending(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Destek Talepleri</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* List */}
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <p className="py-10 text-center text-white/30">Talep yok.</p>
          ) : tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t)}
              className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === t.id ? 'border-[#00F0FF]/30 bg-[#00F0FF]/5' : 'border-white/[0.08] bg-white/[0.03] hover:border-white/15'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-white/40">{t.user_email}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[t.status] ?? ''}`}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                  <span className={`text-xs font-medium ${PRIORITY_STYLES[t.priority] ?? ''}`}>{t.priority}</span>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-white/40">{t.description}</p>
            </button>
          ))}
        </div>

        {/* Detail */}
        {selected && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <h2 className="mb-1 font-semibold text-white">{selected.subject}</h2>
            <p className="mb-4 text-sm text-white/40">{selected.user_email}</p>
            <p className="mb-5 text-sm text-white/60">{selected.description}</p>

            <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
              {(selected.messages ?? []).map((m) => (
                <div key={m.id} className={`rounded-xl p-3 text-sm ${m.sender_role === 'admin' ? 'ml-6 bg-[#00F0FF]/10 text-[#00F0FF]' : 'mr-6 bg-white/5 text-white/70'}`}>
                  <p className="text-xs mb-1 opacity-60">{m.sender_name}</p>
                  {m.content}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Yanıtınız…"
                aria-label="Ticket yanıtı"
                className="input-dark flex-1 resize-none text-sm"
              />
              <button
                type="button"
                onClick={handleReply}
                disabled={sending || !reply.trim()}
                className="self-end rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending ? '…' : 'Gönder'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
