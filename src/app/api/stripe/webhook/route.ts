import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getConsultantWebhookSecret, getAppointment, updateAppointmentStatus, getConsultantProfile } from '@/lib/marketplace';
import { syncToGoogleCalendar, syncToOutlookCalendar, generateICS } from '@/lib/calendar-sync';
import { AppointmentMetadata, Appointment } from '@/types/marketplace';
import nodemailer from 'nodemailer';

const pricingMap: Record<string, { amount: number; name: string }> = {
  starter: { amount: 20000, name: 'Starter' },
  growth: { amount: 100000, name: 'Growth' },
  scale: { amount: 500000, name: 'Scale' },
  executive: { amount: 1000000, name: 'Executive' },
};

async function sendConfirmationEmail(to: string, consultantEmail: string, appointment: Appointment, icsContent: string) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const emailFrom = process.env.EMAIL_FROM || 'Ki Business Solutions <no-reply@kibusiness.co>';

  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.warn('SMTP is not configured; skipping confirmation email.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  const mailBody = `Hello,

Your consultation appointment has been confirmed!

Consultant: ${consultantEmail}
Date: ${appointment.appointment_date}
Time: ${appointment.appointment_time} ${appointment.appointment_timezone || 'UTC'}
Package: ${pricingMap[appointment.package_id]?.name || appointment.package_id}

Please add the attached calendar event to your schedule.

If you have any questions, please contact your consultant directly.

Best regards,
Ki Business Solutions Team`;

  await transporter.sendMail({
    from: emailFrom,
    to,
    subject: 'Your Consultation Appointment Confirmed',
    text: mailBody,
    icalEvent: {
      filename: 'appointment.ics',
      method: 'REQUEST',
      content: icsContent,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature header');
      return NextResponse.json({ error: 'Missing Stripe signature header.' }, { status: 400 });
    }

    let rawEvent: any;
    try {
      rawEvent = JSON.parse(payload);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const session = rawEvent.data?.object;
    const metadata = session?.metadata as AppointmentMetadata | undefined;

    if (!metadata?.consultant_id) {
      console.error('Missing consultant_id in Stripe metadata:', metadata);
      return NextResponse.json({ error: 'Missing consultant_id in Stripe metadata.' }, { status: 400 });
    }

    const consultantId = metadata.consultant_id;
    const webhookSecret = await getConsultantWebhookSecret(consultantId);

    if (!webhookSecret) {
      console.error(`Webhook secret not found for consultant ${consultantId}`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe('sk_test_placeholder', { apiVersion: '2023-10-16' });
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed for consultant ${consultantId}:`, error);
      return NextResponse.json({ error: `Webhook error: ${error.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const sessionObj = event.data.object as Stripe.Checkout.Session;
      const eventMetadata = sessionObj.metadata as unknown as AppointmentMetadata;
      const appointmentId = eventMetadata.session_id || (eventMetadata as any).appointment_id;

      if (!appointmentId) {
        console.error('Missing appointment identifier in webhook metadata', eventMetadata);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      try {
        const appointment = await getAppointment(consultantId, appointmentId);
        if (!appointment) {
          console.error(`Appointment not found: ${appointmentId} for consultant ${consultantId}`);
          return NextResponse.json({ received: true }, { status: 200 });
        }

        await updateAppointmentStatus(consultantId, appointment.id, 'confirmed');

        const consultant = await getConsultantProfile(consultantId);
        if (!consultant) {
          throw new Error(`Consultant profile not found: ${consultantId}`);
        }

        await Promise.allSettled([syncToGoogleCalendar(consultantId, appointment), syncToOutlookCalendar(consultantId, appointment)]);

        const icsContent = generateICS(appointment, consultant.email);
        await sendConfirmationEmail(eventMetadata.customer_email, consultant.email, appointment, icsContent);
      } catch (error) {
        console.error(`Error processing checkout.session.completed for ${consultantId}:`, error);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
