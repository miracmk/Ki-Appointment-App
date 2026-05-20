'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const clientConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || 'AIzaSyBOIvtpXtMyiNHAoW0ed4afoh-wkLoqOFk',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || 'ki-business-consulting.firebaseapp.com',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || 'ki-business-consulting',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || 'ki-business-consulting.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '338155470886',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || '1:338155470886:web:9e8ae8fa4d5053ad1526e7',
};

export function getFirebaseClientApp() {
  if (typeof window === 'undefined') return null;
  try {
    if (!getApps().length) {
      initializeApp(clientConfig);
    }
    return getApp();
  } catch (err) {
    console.error('Firebase initialization failed:', err);
    return null;
  }
}

export function getFirebaseAuth() {
  const app = getFirebaseClientApp();
  return app ? getAuth(app) : null;
}

export function getFirestoreClient() {
  const app = getFirebaseClientApp();
  return app ? getFirestore(app) : null;
}

export function isFirebaseConfigured(): boolean {
  return true;
}
