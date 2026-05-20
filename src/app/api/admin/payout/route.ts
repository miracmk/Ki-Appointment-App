import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { getConsultantProfile } from '@/lib/marketplace';
import { getActiveKiStripePosConfig } from '@/lib/stripe-pos';

/**
 * POST /api/admin/payout
 * Body: { appointment_id: string }
 *
 * Triggers a Stripe Transfer to the consultant for a ki_escrow appointment.
 * Admin-only endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await getAdminAuth().verifyIdToken(token);

    const userRecord = await getAdminAuth().getUser(decoded.uid);
    if (!userRecord.customClaims?.admin) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { appointment_id } = body;

    if (!appointment_id) {
      return NextResponse.json({ error: 'appointment_id is required.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    const apptDoc = await db.collection('appointments').doc(appointment_id).get();

    if (!apptDoc.exists) {
      return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
    }

    const appt = apptDoc.data()!;

    if (appt.payment_mode !== 'ki_escrow') {
      return NextResponse.json(
        { error: 'This appointment is not in ki_escrow mode; payout transfer not applicable.' },
        { status: 400 }
      );
    }

    if (appt.payout_status === 'paid') {
      return NextResponse.json({ error: 'Payout already processed for this appointment.' }, { status: 409 });
    }

    const consultant = await getConsultantProfile(appt.consultant_id);
    if (!consultant) {
      return NextResponse.json({ error: 'Consultant profile not found.' }, { status: 404 });
    }

    if (!consultant.stripe_connect_account_id) {
      return NextResponse.json(
        { error: 'Consultant does not have a linked Stripe Connect account.' },
        { status: 503 }
      );
    }

    const activeConfig = await getActiveKiStripePosConfig();
    const stripe = new Stripe(activeConfig.secretKey, { apiVersion: '2023-10-16' });

    const transferAmount: number = appt.consultant_payout_cents;
    if (!transferAmount || transferAmount <= 0) {
      return NextResponse.json({ error: 'Invalid payout amount.' }, { status: 400 });
    }

    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: 'usd',
      destination: consultant.stripe_connect_account_id,
      transfer_group: appointment_id,
      metadata: {
        appointment_id,
        consultant_id: appt.consultant_id,
      },
    });

    await db.collection('appointments').doc(appointment_id).update({
      payout_status: 'paid',
      stripe_transfer_id: transfer.id,
      updated_at: Date.now(),
    });

    return NextResponse.json({
      success: true,
      transfer_id: transfer.id,
      amount_cents: transferAmount,
    });
  } catch (err: any) {
    console.error('Payout error:', err);
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 });
  }
}
