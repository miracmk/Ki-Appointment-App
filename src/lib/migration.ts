/**
 * Migration Helper: Initialize Firestore Schema for Marketplace
 *
 * This file contains helper functions for setting up and migrating
 * the Firestore database from single-consultant to multi-consultant model.
 *
 * Usage (from Node.js admin context):
 * import { initializeConsultantProfile, migrateExistingUser } from '@/lib/migration'
 * await migrateExistingUser('existing_user_uid')
 */

import { getAdminFirestore, getAdminAuth } from './firebase-admin';
import { encryptSensitiveData } from './crypto';
import { ConsultantProfile } from '@/types/marketplace';

/**
 * Initialize a new consultant profile in Firestore
 */
export async function initializeConsultantProfile(
  uid: string,
  email: string,
  name: string,
  role: 'admin' | 'consultant' = 'consultant'
): Promise<Partial<ConsultantProfile>> {
  const db = getAdminFirestore();

  const profile: Partial<ConsultantProfile> = {
    uid,
    email,
    name,
    role,
    is_active: true,
    payment_mode: 'own_keys',
    stripe_settings: {
      is_active: false,
    },
    calendar_integration: {
      connected: false,
    },
    outlook_calendar: {
      connected: false,
    },
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  await db.collection('users').doc(uid).set(profile, { merge: true });

  return profile;
}

/**
 * Migrate an existing user from old schema to new marketplace schema
 * Preserves existing data and adds marketplace fields
 */
export async function migrateExistingUser(uid: string): Promise<void> {
  const db = getAdminFirestore();
  const auth = getAdminAuth();

  try {
    // Get existing user
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new Error(`User not found: ${uid}`);
    }

    const existingData = userDoc.data();

    // Check if already migrated
    if (existingData?.stripe_settings) {
      console.log(`User ${uid} already has marketplace fields`);
      return;
    }

    // Get user email from auth
    const userRecord = await auth.getUser(uid);

    // Add marketplace fields
    const updates = {
      role: existingData?.role || 'consultant',
      is_active: true,
      stripe_settings: {
        is_active: false,
      },
      calendar_integration: {
        connected: false,
      },
      outlook_calendar: {
        connected: false,
      },
      updated_at: Date.now(),
    };

    await db.collection('users').doc(uid).update(updates);

    console.log(`Migrated user ${uid} (${userRecord.email})`);
  } catch (error) {
    console.error(`Error migrating user ${uid}:`, error);
    throw error;
  }
}

/**
 * Migrate all users in the database
 */
export async function migrateAllUsers(): Promise<{ success: number; failed: number }> {
  const db = getAdminFirestore();
  const auth = getAdminAuth();

  const stats = { success: 0, failed: 0 };

  try {
    // Get all users from auth
    const listResult = await auth.listUsers(1000);

    for (const user of listResult.users) {
      try {
        await migrateExistingUser(user.uid);
        stats.success++;
      } catch (error) {
        console.error(`Failed to migrate user ${user.uid}:`, error);
        stats.failed++;
      }
    }
  } catch (error) {
    console.error('Error migrating users:', error);
    throw error;
  }

  return stats;
}

/**
 * Set up Firestore security rules template
 * Apply these rules in Firestore console
 */
export const FIRESTORE_SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - own profile only
    match /users/{uid} {
      allow read: if request.auth.uid == uid;
      allow write: if request.auth.uid == uid || request.auth.token.admin == true;
      
      // Appointments subcollection
      match /appointments/{appointmentId} {
        allow read: if request.auth.uid == uid || request.auth.token.admin == true;
        allow write: if request.auth.uid == uid || request.auth.token.admin == true;
      }
    }

    // Consultants collection (read-only for appointments)
    match /consultants/{consultantId}/appointments/{appointmentId} {
      allow read: if request.auth.uid == consultantId || request.auth.token.admin == true;
      allow write: if request.auth.uid == consultantId || request.auth.token.admin == true;
    }

    // Admin access to all
    match /{document=**} {
      allow read, write: if request.auth.token.admin == true;
    }
  }
}
`;

/**
 * Set up Firestore indexes
 */
export const FIRESTORE_INDEXES = [
  {
    collectionId: 'users',
    fields: [
      { fieldPath: 'email', order: 'ASCENDING' },
      { fieldPath: 'created_at', order: 'DESCENDING' },
    ],
  },
  {
    collectionId: 'appointments',
    fields: [
      { fieldPath: 'consultant_id', order: 'ASCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'created_at', order: 'DESCENDING' },
    ],
  },
];

/**
 * Helper to set admin claim on a user
 * Call this to make a user an admin
 */
export async function setAdminClaim(uid: string, isAdmin: boolean = true): Promise<void> {
  const auth = getAdminAuth();

  try {
    await auth.setCustomUserClaims(uid, { admin: isAdmin });
    console.log(`Set admin claim for user ${uid}: ${isAdmin}`);
  } catch (error) {
    console.error(`Error setting admin claim for ${uid}:`, error);
    throw error;
  }
}

/**
 * Verify encryption key is set
 */
export function verifyEncryptionKey(): boolean {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 24) {
    console.error('ENCRYPTION_KEY environment variable not set or too short');
    return false;
  }
  return true;
}
