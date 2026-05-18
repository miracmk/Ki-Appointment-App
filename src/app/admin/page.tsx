'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

interface Appointment {
  id: string;
  email: string;
  packageName: string;
  status: string;
  createdAt: string;
}

interface DocumentItem {
  id: string;
  title: string;
  url: string;
  packageId: string;
  userEmail: string;
}

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docPackage, setDocPackage] = useState('starter');
  const [docEmail, setDocEmail] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserEmail(null);
        setLoading(false);
        return;
      }

      const email = user.email ?? '';
      setUserEmail(email);

      const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? 'admin@kibusiness.co')
        .split(',')
        .map((item) => item.trim().toLowerCase());

      const currentIsAdmin = adminEmails.includes(email.toLowerCase());
      setIsAdmin(currentIsAdmin);

      if (!currentIsAdmin) {
        setLoading(false);
        return;
      }

      const db = getFirestoreClient();
      if (!db) {
        setLoading(false);
        return;
      }

      const appointmentsSnapshot = await getDocs(query(collection(db, 'appointments'), orderBy('createdAt', 'desc')));
      const documentsSnapshot = await getDocs(query(collection(db, 'userDocuments'), orderBy('createdAt', 'desc')));

      setAppointments(
        appointmentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          email: doc.data().email,
          packageName: doc.data().packageName,
          status: doc.data().status,
          createdAt: new Date(doc.data().createdAt).toLocaleString(),
        }))
      );

      setDocuments(
        documentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title,
          url: doc.data().url,
          packageId: doc.data().packageId,
          userEmail: doc.data().userEmail || '',
        }))
      );

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
    setIsAdmin(false);
    setUserEmail(null);
  };

  const handleAddDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const db = getFirestoreClient();
    if (!db) {
      setFeedback('Unable to access database.');
      return;
    }

    try {
      await addDoc(collection(db, 'userDocuments'), {
        title: docTitle,
        url: docUrl,
        packageId: docPackage,
        userEmail: docEmail,
        createdAt: new Date().toISOString(),
      });
      setFeedback('Document assigned successfully.');
      setDocTitle('');
      setDocUrl('');
      setDocEmail('');
    } catch (error) {
      console.error(error);
      setFeedback('Failed to add document.');
    }
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <p className="text-gray-700">Loading admin dashboard...</p>
        </div>
      </section>
    );
  }

  if (!userEmail) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Admin panel</h1>
          <p className="mt-3 text-gray-600">Please sign in via the portal to access admin tools.</p>
          <div className="mt-6">
            <Link href="/login" className="rounded-full bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">
              Go to Login
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Access denied</h1>
          <p className="mt-3 text-gray-600">Your account is not configured as an administrator.</p>
          <div className="mt-6">
            <button onClick={handleLogout} className="rounded-full bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">
              Sign Out
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Portal</h1>
            <p className="mt-2 text-gray-600">Manage appointments and assign PDF resources to clients.</p>
            <p className="mt-1 text-sm text-gray-500">Signed in as {userEmail}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Client Portal
            </Link>
            <button onClick={handleLogout} className="inline-flex items-center justify-center rounded-full bg-primary-600 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700">
              Sign out
            </button>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">Appointments</h2>
            {appointments.length === 0 ? (
              <p className="mt-4 text-gray-600">No appointment records found.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {appointments.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-gray-200 p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{item.email}</p>
                        <h3 className="text-lg font-semibold text-gray-900">{item.packageName}</h3>
                      </div>
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">{item.status}</span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600">Booked on {item.createdAt}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900">Assign PDF Documents</h2>
            <form onSubmit={handleAddDocument} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Client Email</label>
                <input
                  value={docEmail}
                  onChange={(event) => setDocEmail(event.target.value)}
                  type="email"
                  required
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Document Title</label>
                <input
                  value={docTitle}
                  onChange={(event) => setDocTitle(event.target.value)}
                  type="text"
                  required
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Document URL</label>
                <input
                  value={docUrl}
                  onChange={(event) => setDocUrl(event.target.value)}
                  type="url"
                  required
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Package</label>
                <select
                  value={docPackage}
                  onChange={(event) => setDocPackage(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="scale">Scale</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

              <Button type="submit" variant="primary" className="w-full">
                Assign Document
              </Button>
            </form>
            {feedback && <p className="mt-4 text-sm text-primary-700">{feedback}</p>}
          </div>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900">Shared Documents</h2>
          {documents.length === 0 ? (
            <p className="mt-4 text-gray-600">No shared documents have been added yet.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {documents.map((document) => (
                <div key={document.id} className="rounded-3xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{document.title}</h3>
                      <p className="text-sm text-gray-500">{document.userEmail || 'General'} • {document.packageId}</p>
                    </div>
                    <a href={document.url} target="_blank" rel="noreferrer" className="rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
                      View PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
