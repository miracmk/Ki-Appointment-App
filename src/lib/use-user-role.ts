'use client';

import { useState, useEffect } from 'react';
import { getFirebaseAuth, getFirestoreClient } from './firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export type AppRole = 'superadmin' | 'admin' | 'consultant' | 'client';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string | null;
  role: AppRole;
  kycStatus: string;
}

interface UseUserRoleReturn {
  user: AppUser | null;
  loading: boolean;
}

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

export function useUserRole(): UseUserRoleReturn {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const db = getFirestoreClient();
        if (db) {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              displayName: firebaseUser.displayName,
              role: (data.role as AppRole) ?? 'client',
              // Support both camelCase (new) and snake_case (legacy) field names
              kycStatus: data.kycStatus ?? data.kyc_status ?? 'unverified',
            });
            setLoading(false);
            return;
          }
        }
      } catch {
        // Firestore unavailable — fall through to email-based fallback
      }

      // Fallback: check env-var admin emails list
      const role: AppRole = ADMIN_EMAILS.includes((firebaseUser.email ?? '').toLowerCase())
        ? 'superadmin'
        : 'client';
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        displayName: firebaseUser.displayName,
        role,
        kycStatus: 'unverified',
      });
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { user, loading };
}
