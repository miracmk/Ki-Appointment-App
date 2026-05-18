import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  : null;

const documentMappings: Record<string, { title: string; url: string }> = {
  starter: {
    title: 'Starter Engagement Guide',
    url: '/documents/starter.pdf',
  },
  growth: {
    title: 'Growth Strategy Playbook',
    url: '/documents/growth.pdf',
  },
  scale: {
    title: 'Scale Transformation Toolkit',
    url: '/documents/scale.pdf',
  },
  executive: {
    title: 'Executive Leadership Blueprint',
    url: '/documents/executive.pdf',
  },
};

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || '587');
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;
const emailFrom = process.env.EMAIL_FROM || 'Ki Business Solutions <no-reply@kibusiness.co>';

function getPackageName(packageId: string) {
  switch (packageId) {
    case 'starter':
      return 'Starter';
    case 'growth':
      return 'Growth';
    case 'scale':
      return 'Scale';
    case 'executive':
      return 'Executive';
    default:
      return 'Consultation';
  }
}

async function sendConfirmationEmail(to: string, password: string, packageName: string, sessionUrl: string) {
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

Thank you for booking the ${packageName} consultation with Ki Business Solutions.

Your client portal credentials are ready below:

Email: ${to}
Password: ${password}

Sign in at: ${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'}/login

We have recorded your appointment and assigned your package documents. Please login to view your appointments and download your documents.

Best regards,
Ki Business Solutions Team`;

  await transporter.sendMail({
    from: emailFrom,
    to,
    subject: 'Your Ki Business Solutions Consultation Confirmation',
    text: mailBody,
  });
}

export async function POST(request: Request) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.' },
      { status: 500 }
    );
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature header.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: `Webhook error: ${error.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email || session.customer_email;
    const packageId = session.metadata?.packageId as string || 'starter';
    const packageName = getPackageName(packageId);
    const amount = session.amount_total || 0;
    const userEmail = email?.toString() ?? '';
    const auth = getAdminAuth();
    const db = getAdminFirestore();

    if (!userEmail) {
      console.error('Stripe session does not include customer email.');
      return NextResponse.json({ error: 'Missing customer email in Stripe session.' }, { status: 400 });
    }

    try {
      let userRecord;
      let plainPassword = crypto.randomBytes(10).toString('hex');

      try {
        userRecord = await auth.getUserByEmail(userEmail);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            email: userEmail,
            password: plainPassword,
          });
        } else {
          throw error;
        }
      }

      if (!userRecord.passwordHash) {
        plainPassword = crypto.randomBytes(10).toString('hex');
        await auth.updateUser(userRecord.uid, { password: plainPassword });
      }

      const userRef = db.collection('users').doc(userRecord.uid);
      await userRef.set(
        {
          email: userEmail,
          packageId,
          packageName,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await db.collection('appointments').add({
        userId: userRecord.uid,
        email: userEmail,
        packageId,
        packageName,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        amount,
        currency: 'usd',
        stripeSessionId: session.id,
      });

      const docInfo = documentMappings[packageId] || documentMappings.starter;
      await db.collection('userDocuments').add({
        userId: userRecord.uid,
        userEmail,
        packageId,
        title: docInfo.title,
        url: docInfo.url,
        createdAt: new Date().toISOString(),
      });

      await sendConfirmationEmail(userEmail, plainPassword, packageName, process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
    } catch (error) {
      console.error('Webhook processing failed:', error);
      return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
