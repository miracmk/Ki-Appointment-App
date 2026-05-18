'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

interface Appointment {
  id: string;
  packageName: string;
  status: string;
  createdAt: string;
  amount: number;
}

interface DocumentItem {
  id: string;
  title: string;
  url: string;
  packageId: string;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email);
      setUid(user.uid);
      const db = getFirestoreClient();
      if (!db) {
        setLoading(false);
        return;
      }

      const appointmentsSnapshot = await getDocs(
        query(
          collection(db, 'appointments'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        )
      );

      const documentSnapshot = await getDocs(
        query(
          collection(db, 'userDocuments'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        )
      );

      setAppointments(
        appointmentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          packageName: doc.data().packageName,
          status: doc.data().status,
          createdAt: new Date(doc.data().createdAt).toLocaleString(),
          amount: doc.data().amount,
        }))
      );

      setDocuments(
        documentSnapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          url: doc.data().url,
          packageId: doc.data().packageId,
        }))
      );

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <p className="text-gray-700">Loading your portal...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Client Portal</h1>
            <p className="mt-2 text-gray-600">Welcome back{userEmail ? `, ${userEmail}` : ''}. Review your appointments and documents.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Home
            </Link>
            <button onClick={handleLogout} className="inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700">
              Log out
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">My Appointments</h2>
            {appointments.length === 0 ? (
              <p className="mt-4 text-gray-600">No appointments found yet. Book a consultation from the homepage.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-3xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{appointment.packageName}</h3>
                        <p className="text-sm text-gray-600">Booked on {appointment.createdAt}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusColors[appointment.status] ?? 'bg-gray-100 text-gray-800'}`}>
                        {appointment.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600">Amount paid: ${appointment.amount / 100}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">My Documents</h2>
            {documents.length === 0 ? (
              <p className="mt-4 text-gray-600">Your documents will appear here once your consultation is confirmed.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {documents.map((document) => (
                  <div key={document.id} className="rounded-3xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{document.title}</h3>
                        <p className="text-sm text-gray-600">Package: {document.packageId}</p>
                      </div>
                      <a href={document.url} target="_blank" rel="noreferrer" className="rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
