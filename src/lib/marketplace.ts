import { getAdminFirestore } from './firebase-admin';
import { decryptSensitiveData } from './encryption';
import { ConsultantProfile, Appointment } from '@/types/marketplace';

/**
 * Fetch a consultant's profile from Firestore
 */
export async function getConsultantProfile(consultantId: string): Promise<ConsultantProfile | null> {
  try {
    const db = getAdminFirestore();
    const doc = await db.collection('users').doc(consultantId).get();

    if (!doc.exists) {
      console.warn(`Consultant profile not found: ${consultantId}`);
      return null;
    }

    return doc.data() as ConsultantProfile;
  } catch (error) {
    console.error(`Error fetching consultant profile ${consultantId}:`, error);
    throw error;
  }
}

/**
 * Get decrypted Stripe API key for a consultant
 */
export async function getConsultantStripeApiKey(consultantId: string): Promise<string | null> {
  try {
    const profile = await getConsultantProfile(consultantId);
    if (!profile?.stripe_settings?.is_active) {
      return null;
    }

    const { api_key_encrypted, api_key_iv, api_key_authTag } = profile.stripe_settings;
    if (!api_key_encrypted || !api_key_iv || !api_key_authTag) {
      return null;
    }

    return decryptSensitiveData(api_key_encrypted, api_key_iv, api_key_authTag);
  } catch (error) {
    console.error(`Error decrypting Stripe key for consultant ${consultantId}:`, error);
    return null;
  }
}

/**
 * Get decrypted Stripe webhook secret for a consultant
 */
export async function getConsultantWebhookSecret(consultantId: string): Promise<string | null> {
  try {
    const profile = await getConsultantProfile(consultantId);
    if (!profile?.stripe_settings?.is_active) {
      return null;
    }

    const { webhook_secret_encrypted, webhook_secret_iv, webhook_secret_authTag } = profile.stripe_settings;
    if (!webhook_secret_encrypted || !webhook_secret_iv || !webhook_secret_authTag) {
      return null;
    }

    return decryptSensitiveData(webhook_secret_encrypted, webhook_secret_iv, webhook_secret_authTag);
  } catch (error) {
    console.error(`Error decrypting webhook secret for consultant ${consultantId}:`, error);
    return null;
  }
}

/**
 * Create or update an appointment in Firestore
 */
export async function createAppointment(
  consultantId: string,
  appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
): Promise<string> {
  try {
    const db = getAdminFirestore();
    const appointmentsRef = db.collection('consultants').doc(consultantId).collection('appointments');

    const newDoc = await appointmentsRef.add({
      ...appointment,
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    return newDoc.id;
  } catch (error) {
    console.error(`Error creating appointment for consultant ${consultantId}:`, error);
    throw error;
  }
}

/**
 * Update appointment status (e.g., after webhook confirmation)
 */
export async function updateAppointmentStatus(
  consultantId: string,
  appointmentId: string,
  status: Appointment['status']
): Promise<void> {
  try {
    const db = getAdminFirestore();
    await db
      .collection('consultants')
      .doc(consultantId)
      .collection('appointments')
      .doc(appointmentId)
      .update({
        status,
        updated_at: Date.now(),
      });
  } catch (error) {
    console.error(
      `Error updating appointment status ${appointmentId} for consultant ${consultantId}:`,
      error
    );
    throw error;
  }
}

/**
 * Get an appointment by ID
 */
export async function getAppointment(consultantId: string, appointmentId: string): Promise<Appointment | null> {
  try {
    const db = getAdminFirestore();
    const doc = await db
      .collection('consultants')
      .doc(consultantId)
      .collection('appointments')
      .doc(appointmentId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as Appointment;
  } catch (error) {
    console.error(
      `Error fetching appointment ${appointmentId} for consultant ${consultantId}:`,
      error
    );
    throw error;
  }
}

/**
 * Get consultant by email (for admin access)
 */
export async function getConsultantByEmail(email: string): Promise<ConsultantProfile | null> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as ConsultantProfile;
  } catch (error) {
    console.error(`Error fetching consultant by email ${email}:`, error);
    throw error;
  }
}
