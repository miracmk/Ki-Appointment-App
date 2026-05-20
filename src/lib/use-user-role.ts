'use client';

import { useState, useEffect } from 'react';
import { getFirebaseAuth, getFirestoreClient } from './firebase-client';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export type AppRole = 'admin' | 'supervisor' | 'consultant' | 'client';

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

// kibusiness.global@gmail.com is ALWAYS the master admin — hardcoded lock
const MASTER_ADMIN_EMAIL = 'kibusiness.global@gmail.com';

// Additional supervisor emails from env (comma-separated)
const SUPERVISOR_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function useUserRole(): UseUserRoleReturn {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { setUser(null); setLoading(false); return; }

      const emailLower = (firebaseUser.email ?? '').toLowerCase();

      // Master admin lock — this email is always 'admin' regardless of Firestore
      if (emailLower === MASTER_ADMIN_EMAIL) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName,
          role: 'admin',
          kycStatus: 'verified',
        });
        setLoading(false);
        return;
      }

      // Try Firestore user document first
      try {
        const db = getFirestoreClient();
        if (db) {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            const firestoreRole = data.role as AppRole;
            // Validate role is one of our 4 tiers
            const validRoles: AppRole[] = ['admin', 'supervisor', 'consultant', 'client'];
            const role: AppRole = validRoles.includes(firestoreRole) ? firestoreRole : 'client';
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              displayName: firebaseUser.displayName,
              role,
              kycStatus: data.kycStatus ?? data.kyc_status ?? 'unverified',
            });
            setLoading(false);
            return;
          }
        }
      } catch {
        // Firestore unavailable — fall through to email fallback
      }

      // Env-var fallback: NEXT_PUBLIC_ADMIN_EMAILS → supervisor
      const role: AppRole = SUPERVISOR_EMAILS.includes(emailLower) ? 'supervisor' : 'client';
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

// Helpers used across guards
export function isManagement(role: AppRole) {
  return role === 'admin' || role === 'supervisor';
}

export function hasConsultantAccess(role: AppRole) {
  return role === 'admin' || role === 'supervisor' || role === 'consultant';
}
