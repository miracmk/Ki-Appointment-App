import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';

async function verifyRole(request: NextRequest): Promise<{ uid: string; role: string } | { error: string; status: number }> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return { error: 'Missing token', status: 401 };
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const db = getAdminFirestore();
    const snap = await db.collection('users').doc(decoded.uid).get();
    const role = snap.data()?.role ?? 'client';
    // master admin override
    if (decoded.email === 'kibusiness.global@gmail.com') return { uid: decoded.uid, role: 'admin' };
    return { uid: decoded.uid, role };
  } catch {
    return { error: 'Invalid token', status: 401 };
  }
}

function platformTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '465');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

function customTransport(host: string, port: number, user: string, pass: string) {
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyRole(request);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { role, uid } = auth;
    const allowed = ['admin', 'supervisor', 'consultant'];
    if (!allowed.includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { to, subject, text, html } = body;
    if (!to || !subject || (!text && !html)) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, text/html' }, { status: 400 });
    }

    let transport: nodemailer.Transporter | null = null;
    let fromAddress = process.env.EMAIL_FROM || 'Ki Business Solutions <consulting@kibusiness.co>';

    if (role === 'admin') {
      transport = platformTransport();
      if (!transport) return NextResponse.json({ error: 'Platform SMTP not configured' }, { status: 503 });

    } else if (role === 'supervisor') {
      const db = getAdminFirestore();
      const snap = await db.collection('users').doc(uid).get();
      const smtpCfg = snap.data()?.smtp_settings;
      if (!smtpCfg?.host || !smtpCfg?.user || !smtpCfg?.pass) {
        return NextResponse.json({
          error: 'Supervisor SMTP not configured. Please add your SMTP settings in Dashboard → Settings → Integrations.',
          needs_smtp_config: true,
        }, { status: 503 });
      }
      transport = customTransport(smtpCfg.host, Number(smtpCfg.port || 465), smtpCfg.user, smtpCfg.pass);
      fromAddress = smtpCfg.from || `${snap.data()?.displayName || 'Ki Supervisor'} <${smtpCfg.user}>`;

    } else if (role === 'consultant') {
      // Consultant can only send to their own clients — validate
      const db = getAdminFirestore();
      const apptSnap = await db.collection('appointments')
        .where('consultant_id', '==', uid)
        .where('customer_email', '==', to)
        .limit(1)
        .get();
      if (apptSnap.empty) {
        return NextResponse.json({ error: 'You can only email clients who have booked with you.' }, { status: 403 });
      }
      transport = platformTransport();
      const consultantSnap = await db.collection('users').doc(uid).get();
      const cName = consultantSnap.data()?.displayName || consultantSnap.data()?.name || 'Consultant';
      fromAddress = `${cName} via Ki Business <consulting@kibusiness.co>`;
      if (!transport) return NextResponse.json({ error: 'Platform SMTP not configured' }, { status: 503 });
    }

    if (!transport) return NextResponse.json({ error: 'No transport available' }, { status: 503 });

    await transport.sendMail({
      from: fromAddress,
      to,
      subject,
      ...(text ? { text } : {}),
      ...(html ? { html } : {}),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[email/send]', err);
    return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 });
  }
}
