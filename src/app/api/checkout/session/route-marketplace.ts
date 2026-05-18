import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getConsultantStripeApiKey, createAppointment } from '@/lib/marketplace';
import { AppointmentMetadata, Appointment } from '@/types/marketplace';

const pricingMap: Record<string, { amount: number; name: string }> = {
  starter: { amount: 20000, name: 'Starter Consultation Package' },
  growth: { amount: 100000, name: 'Growth Consultation Package' },
  scale: { amount: 500000, name: 'Scale Consultation Package' },
  executive: { amount: 1000000, name: 'Executive Consultation Package' },
};

/**
 * POST /api/checkout/session
 *
 * Create a dynamic Stripe checkout session for a specific consultant.
 * Expects:
 * {
 *   consultantId: string,
 *   packageId: string,
 *   customerEmail: string,
 *   customerName?: string,
 *   appointmentDate: string (ISO 8601),
 *   appointmentTime: string (HH:mm),
 *   appointmentTimezone?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      consultantId,
      packageId,
      customerEmail,
      customerName,
      appointmentDate,
      appointmentTime,
      appointmentTimezone,
    } = body;

    // Validate required fields
    if (!consultantId || !packageId || !customerEmail || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        { error: 'Missing required fields: consultantId, packageId, customerEmail, appointmentDate, appointmentTime' },
        { status: 400 }
      );
    }

    // Validate package
    const selectedPackage = pricingMap[packageId];
    if (!selectedPackage) {
      return NextResponse.json({ error: 'Invalid package selected.' }, { status: 400 });
    }

    // Get consultant's Stripe API key
    const stripeApiKey = await getConsultantStripeApiKey(consultantId);
    if (!stripeApiKey) {
      console.error(`Stripe not configured for consultant ${consultantId}`);
      return NextResponse.json(
        {
          error: 'Stripe is not configured for this consultant. Please contact support or the consultant.',
        },
        { status: 503 }
      );
    }

    // Create Stripe instance for this consultant
    const stripe = new Stripe(stripeApiKey, { apiVersion: '2023-10-16' });

    // Create appointment record first
    const appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'> = {
      consultant_id: consultantId,
      customer_email: customerEmail,
      customer_name: customerName,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      appointment_timezone: appointmentTimezone || 'UTC',
      package_id: packageId,
      status: 'pending',
      payment_amount: selectedPackage.amount,
    };

    const appointmentId = await createAppointment(consultantId, appointmentData);

    // Prepare checkout metadata
    const metadata: Stripe.MetadataParam = {
      consultant_id: consultantId,
      customer_email: customerEmail,
      customer_name: customerName || '',
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      appointment_timezone: appointmentTimezone || 'UTC',
      package_id: packageId,
      session_id: appointmentId,
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId}`;
    const cancelUrl = `${baseUrl}/#pricing`;

    // Create checkout session with consultant's Stripe instance
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPackage.name,
              description: `Consultation with consultant`,
            },
            unit_amount: selectedPackage.amount,
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
    });

    return NextResponse.json({
      sessionId: session.id,
      appointmentId,
    });
  } catch (error: any) {
    console.error('Stripe Checkout session error:', error);

    // Graceful error handling - don't expose internal details
    if (error.message?.includes('authentication')) {
      return NextResponse.json(
        { error: 'Stripe authentication failed. Please check consultant configuration.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Unable to create Stripe checkout session.' },
      { status: 500 }
    );
  }
}
