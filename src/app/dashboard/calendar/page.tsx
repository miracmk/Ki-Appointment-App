'use client';

import { useEffect, useState } from 'react';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useUserRole } from '@/lib/use-user-role';
import type { FlatAppointment } from '@/types/marketplace';

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  pending:   'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  cancelled: 'border-red-500/30 bg-red-500/10 text-red-400',
  completed: 'border-[#00F0FF]/20 bg-[#00F0FF]/10 text-[#00F0FF]',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

type Appt = FlatAppointment & { id: string };

function buildCalendarDays(year: number, month: number, appointments: Appt[]) {
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const apptMap   = new Map<string, Appt[]>();

  for (const a of appointments) {
    const key = a.appointment_date; // "YYYY-MM-DD"
    if (!apptMap.has(key)) apptMap.set(key, []);
    apptMap.get(key)!.push(a);
  }

  const cells: Array<{ day: number | null; appts: Appt[] }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, appts: [] });
  for (let d = 1; d <= daysInMon; d++) {
    const key  = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, appts: apptMap.get(key) ?? [] });
  }
  return cells;
}

export default function CalendarPage() {
  const { user } = useUserRole();
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [loading, setLoading]           = useState(true);
  const [view, setView]                 = useState<'month' | 'list'>('month');
  const today = new Date();
  const [calYear,  setYear]  = useState(today.getFullYear());
  const [calMonth, setMonth] = useState(today.getMonth());

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { setLoading(false); return; }
      const db = getFirestoreClient();
      if (!db) { setLoading(false); return; }

      const isConsultant = user?.role === 'consultant';
      const isManagement = user?.role === 'admin' || user?.role === 'supervisor';

      let q;
      if (isManagement) {
        q = query(collection(db, 'appointments'));
      } else if (isConsultant) {
        q = query(collection(db, 'appointments'), where('consultant_id', '==', firebaseUser.uid));
      } else {
        q = query(collection(db, 'appointments'), where('customer_email', '==', firebaseUser.email));
      }

      const snap = await getDocs(q);
      const data = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<FlatAppointment, 'id'>) }))
        .filter((a) => a.status !== 'cancelled')
        .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
      setAppointments(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.role]);

  const prevMonth = () => {
    if (calMonth === 0) { setYear(calYear - 1); setMonth(11); }
    else setMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setYear(calYear + 1); setMonth(0); }
    else setMonth(calMonth + 1);
  };

  const cells       = buildCalendarDays(calYear, calMonth, appointments);
  const todayStr    = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const futureAppts = appointments.filter((a) => a.appointment_date >= todayStr);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">My Calendar</h1>
        <div className="flex gap-2">
          {(['month', 'list'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-xl border px-3 py-1.5 text-sm font-medium capitalize transition ${
                view === v
                  ? 'border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF]'
                  : 'border-white/10 bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00F0FF] border-t-transparent" />
        </div>
      ) : view === 'month' ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <button type="button" onClick={prevMonth} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="font-semibold text-white">{MONTH_NAMES[calMonth]} {calYear}</h2>
            <button type="button" onClick={nextMonth} className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/[0.06]">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-white/30">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const cellKey = cell.day
                ? `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}`
                : null;
              const isToday = cellKey === todayStr;
              return (
                <div
                  key={i}
                  className={`min-h-[80px] border-b border-r border-white/[0.04] p-1.5 ${
                    !cell.day ? 'bg-white/[0.01]' : ''
                  }`}
                >
                  {cell.day && (
                    <>
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday ? 'bg-[#00F0FF] text-black' : 'text-white/50'
                      }`}>
                        {cell.day}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {cell.appts.slice(0, 2).map((a) => (
                          <div key={a.id} className={`rounded px-1.5 py-0.5 text-[10px] font-medium truncate border ${STATUS_STYLES[a.status] ?? 'border-white/10 text-white/40'}`}>
                            {a.appointment_time} {a.package_name}
                          </div>
                        ))}
                        {cell.appts.length > 2 && (
                          <div className="px-1.5 text-[10px] text-white/30">+{cell.appts.length - 2} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="space-y-3">
          {futureAppts.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] py-16 text-center">
              <p className="text-white/40">No upcoming appointments on your calendar.</p>
            </div>
          ) : (
            futureAppts.map((a) => (
              <div key={a.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-lg border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status] ?? ''}`}>
                        {a.status}
                      </span>
                      <p className="font-medium text-white">{a.package_name}</p>
                    </div>
                    <p className="mt-1 text-sm text-white/40">
                      {a.appointment_date} · {a.appointment_time}
                      {a.appointment_timezone && <span className="ml-1 text-white/25">({a.appointment_timezone})</span>}
                    </p>
                    {a.consultant_name && <p className="text-xs text-white/30">Consultant: {a.consultant_name}</p>}
                    {a.customer_name   && user?.role !== 'client' && <p className="text-xs text-white/30">Client: {a.customer_name}</p>}
                  </div>
                  {a.meet_link && (
                    <a
                      href={a.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-xl border border-[#00F0FF]/20 bg-[#00F0FF]/10 px-3 py-1.5 text-xs font-medium text-[#00F0FF] transition hover:bg-[#00F0FF]/20"
                    >
                      Join Call
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
