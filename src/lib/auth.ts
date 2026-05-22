'use client';

import { OAuthProvider, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreClient } from '@/lib/firebase-client';
import type { AppRole } from '@/lib/use-user-role';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function getDefaultRole(email?: string, requestedRole: AppRole = 'client'): AppRole {
  if (isAdminEmail(email)) return 'admin';
  return requestedRole === 'consultant' ? 'consultant' : 'client';
}

export function createMicrosoftProvider() {
  const provider = new OAuthProvider('microsoft.com');
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50) || 'user';
}

async function generateUniqueSlug(baseSlug: string, uid: string) {
  const db = getFirestoreClient();
  if (!db) return `${baseSlug}-${uid.slice(0, 6)}`;
  let slug = slugify(baseSlug);
  let count = 1;

  while (true) {
    const existing = await getDocs(query(collection(db, 'users'), where('slug', '==', slug)));
    if (existing.empty) return slug;
    if (existing.docs.length === 1 && existing.docs[0].id === uid) return slug;
    slug = `${slugify(baseSlug)}-${count}`;
    count += 1;
  }
}

export async function ensureUserDoc(user: User, requestedRole: AppRole = 'client') {
  const db = getFirestoreClient();
  if (!db) return;

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  const email = user.email ?? '';
  const displayName = user.displayName || email.split('@')[0] || 'User';
  const role = getDefaultRole(email, requestedRole);
  const slug = await generateUniqueSlug(displayName, user.uid);
  const now = Date.now();

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid:          user.uid,
      email,
      displayName,
      photo_url:    user.photoURL ?? '',
      role,
      slug,
      kycStatus:    'unverified',
      walletBalance: 0,
      isActive:     true,
      name:         displayName,
      kyc_status:   'none',
      ki_wallet_cents: 0,
      created_at:   now,
      updated_at:   now,
      is_active:    true,
    });
    return;
  }

  const data = snapshot.data();
  const updates: Record<string, unknown> = {
    email,
    displayName,
    name: displayName,
    updated_at: now,
  };

  if (!data?.slug) {
    updates.slug = slug;
  }

  if (data?.role !== 'admin' && role === 'admin') {
    updates.role = 'admin';
  }

  await setDoc(userRef, updates, { merge: true });
}

export async function setAuthSessionCookie(idToken: string) {
  await fetch('/api/auth/session', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
}

export async function clearAuthSessionCookie() {
  await fetch('/api/auth/session', {
    method: 'DELETE',
    credentials: 'same-origin',
  });
}
