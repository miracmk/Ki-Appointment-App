import { NextResponse, NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import {
  updateConsultantStripeSettings,
  updateConsultantCalendar,
  updateConsultantOutlookCalendar,
  disableConsultantStripe,
  disconnectCalendar,
  disconnectOutlookCalendar,
} from '@/lib/consultant-settings';
import { PaymentMode } from '@/types/marketplace';

/**
 * POST /api/admin/consultant-settings
 *
 * Admin endpoint to manage consultant integrations
 * Requires admin authentication
 *
 * Body examples:
 * {
 *   action: 'update_stripe',
 *   consultant_id: 'uid...',
 *   api_key: 'sk_...',
 *   webhook_secret: 'whsec_...'
 * }
 *
 * {
 *   action: 'update_calendar',
 *   consultant_id: 'uid...',
 *   refresh_token: 'token...',
 *   calendar_id: 'primary'
 * }
 *
 * {
 *   action: 'disconnect_calendar',
 *   consultant_id: 'uid...'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    // Verify token and get user
    const auth = getAdminAuth();
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(authToken);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Check if user is admin (you may want to add a custom claim for this)
    const userRecord = await auth.getUser(decodedToken.uid);
    if (!userRecord.customClaims?.admin) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { action, consultant_id } = body;

    if (!consultant_id) {
      return NextResponse.json({ error: 'Missing consultant_id' }, { status: 400 });
    }

    if (action === 'update_profile') {
      const { name, title, expertise, photo_url } = body;
      if (!name) {
        return NextResponse.json({ error: 'name field is required.' }, { status: 400 });
      }
      const db = await import('@/lib/firebase-admin').then((m) => m.getAdminFirestore());
      await db.collection('users').doc(consultant_id).set(
        { name, title: title || '', expertise: expertise || '', photo_url: photo_url || '', updated_at: Date.now() },
        { merge: true }
      );
      return NextResponse.json({ success: true, message: 'Profile updated.' });
    }

    if (action === 'update_stripe') {
      const { api_key, webhook_secret } = body;
      if (!api_key || !webhook_secret) {
        return NextResponse.json(
          { error: 'Missing api_key or webhook_secret' },
          { status: 400 }
        );
      }

      await updateConsultantStripeSettings(consultant_id, api_key, webhook_secret);
      return NextResponse.json({ success: true, message: 'Stripe settings updated' });
    }

    if (action === 'update_calendar') {
      const { refresh_token, calendar_id } = body;
      if (!refresh_token || !calendar_id) {
        return NextResponse.json(
          { error: 'Missing refresh_token or calendar_id' },
          { status: 400 }
        );
      }

      await updateConsultantCalendar(consultant_id, refresh_token, calendar_id);
      return NextResponse.json({ success: true, message: 'Calendar settings updated' });
    }

    if (action === 'update_outlook') {
      const { refresh_token } = body;
      if (!refresh_token) {
        return NextResponse.json({ error: 'Missing refresh_token' }, { status: 400 });
      }

      await updateConsultantOutlookCalendar(consultant_id, refresh_token);
      return NextResponse.json({ success: true, message: 'Outlook Calendar settings updated' });
    }

    if (action === 'disable_stripe') {
      await disableConsultantStripe(consultant_id);
      return NextResponse.json({ success: true, message: 'Stripe disabled for consultant' });
    }

    if (action === 'disconnect_calendar') {
      await disconnectCalendar(consultant_id);
      return NextResponse.json({ success: true, message: 'Calendar disconnected' });
    }

    if (action === 'disconnect_outlook') {
      await disconnectOutlookCalendar(consultant_id);
      return NextResponse.json({ success: true, message: 'Outlook Calendar disconnected' });
    }

    if (action === 'update_payment_mode') {
      const { payment_mode } = body;
      const validModes: PaymentMode[] = ['ki_escrow', 'own_keys', 'ki_connect', 'direct'];
      if (!payment_mode || !validModes.includes(payment_mode)) {
        return NextResponse.json(
          { error: `Invalid payment_mode. Valid values: ${validModes.join(', ')}` },
          { status: 400 }
        );
      }
      const db = await import('@/lib/firebase-admin').then((m) => m.getAdminFirestore());
      await db.collection('users').doc(consultant_id).set(
        { payment_mode, updated_at: Date.now() },
        { merge: true }
      );
      return NextResponse.json({ success: true, message: 'Payment mode updated.' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in consultant settings endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
