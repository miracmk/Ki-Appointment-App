import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { getKiStripePosSlots, upsertKiStripePosSlot, setActiveKiStripePosSlot, deleteKiStripePosSlot } from '@/lib/stripe-pos';

async function verifyAdmin(request: NextRequest) {
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!authToken) return { error: 'Missing authorization token', status: 401 };
  const auth = getAdminAuth();
  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(authToken);
  } catch {
    return { error: 'Invalid or expired token', status: 401 };
  }
  const userRecord = await auth.getUser(decodedToken.uid);
  if (!userRecord.customClaims?.admin) {
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return { error: 'Unauthorized. Admin access required.', status: 403 };
    }
  }
  return { uid: decodedToken.uid };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const slots = (await getKiStripePosSlots()).map((slot) => ({
      id: slot.id,
      label: slot.label,
      isActive: slot.isActive,
      created_at: slot.created_at,
      updated_at: slot.updated_at,
    }));
    return NextResponse.json({ success: true, slots });
  } catch (error: any) {
    console.error('Error fetching POS slots:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const action = body.action;

    if (action === 'save_slot') {
      const { slot_id, label, publishable_key, secret_key, webhook_secret } = body;
      if (!label || !publishable_key || !secret_key || !webhook_secret) {
        return NextResponse.json({ error: 'Missing required slot fields' }, { status: 400 });
      }

      const slot = await upsertKiStripePosSlot({
        id: slot_id,
        label,
        publishableKey: publishable_key,
        secretKey: secret_key,
        webhookSecret: webhook_secret,
        isActive: body.isActive ?? false,
      });

      const safeSlot = {
        id: slot.id,
        label: slot.label,
        isActive: slot.isActive,
        created_at: slot.created_at,
        updated_at: slot.updated_at,
      };
      return NextResponse.json({ success: true, slot: safeSlot, message: 'POS slot saved' });
    }

    if (action === 'activate_slot') {
      const { slot_id } = body;
      if (!slot_id) {
        return NextResponse.json({ error: 'Missing slot_id' }, { status: 400 });
      }
      await setActiveKiStripePosSlot(slot_id);
      return NextResponse.json({ success: true, message: 'POS slot activated' });
    }

    if (action === 'delete_slot') {
      const { slot_id } = body;
      if (!slot_id) {
        return NextResponse.json({ error: 'Missing slot_id' }, { status: 400 });
      }
      await deleteKiStripePosSlot(slot_id);
      return NextResponse.json({ success: true, message: 'POS slot deleted' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating POS slots:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
