import nodemailer from 'nodemailer';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://consultation.kibusiness.co';
const FROM    = process.env.EMAIL_FROM || 'Ki Business Solutions <consultation@kibusiness.co>';

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

function fmtDate(date: string, time: string, tz: string): string {
  try {
    return (
      new Date(`${date}T${time}:00`).toLocaleDateString('en-US', {
        timeZone: tz || 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }) + ', ' + time + ' (' + (tz || 'UTC') + ')'
    );
  } catch { return `${date} ${time} (${tz})`; }
}

function fmtDuration(minutes: number): string {
  if (minutes < 60)   return `${minutes} minutes`;
  if (minutes === 60) return '1 hour';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h} hours`;
}

async function send(opts: nodemailer.SendMailOptions): Promise<void> {
  const t = createTransporter();
  if (!t) { console.warn('[email] SMTP not configured, skipping'); return; }
  await t.sendMail(opts);
}

// ─── Consultant: new booking after payment ────────────────────────────────────

export async function sendConsultantBookingNotification(p: {
  consultantEmail: string;
  consultantName:  string;
  clientName:      string;
  clientEmail:     string;
  listingTitle:    string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentTimezone: string;
  durationMinutes: number;
  appointmentId:   string;
}): Promise<void> {
  const dateDisplay = fmtDate(p.appointmentDate, p.appointmentTime, p.appointmentTimezone);
  const confirmUrl  = `${APP_URL}/consultant/appointments`;

  await send({
    from: FROM,
    to:   p.consultantEmail,
    subject: `New Booking Request – ${p.listingTitle}`,
    text: `Dear ${p.consultantName},

A new booking has been paid and is awaiting your confirmation.

Client    : ${p.clientName} (${p.clientEmail})
Service   : ${p.listingTitle}
Date/Time : ${dateDisplay}
Duration  : ${fmtDuration(p.durationMinutes)}

Please log in to your consultant portal to confirm or reschedule:
${confirmUrl}

Best regards,
Ki Business Solutions`,
  });
}

// ─── Client: payment received, awaiting confirmation ─────────────────────────

export async function sendClientBookingPending(p: {
  clientEmail:      string;
  clientName:       string;
  consultantName:   string;
  listingTitle:     string;
  appointmentDate:  string;
  appointmentTime:  string;
  appointmentTimezone: string;
  durationMinutes:  number;
}): Promise<void> {
  const dateDisplay = fmtDate(p.appointmentDate, p.appointmentTime, p.appointmentTimezone);

  await send({
    from: FROM,
    to:   p.clientEmail,
    subject: `Booking Request Received – ${p.listingTitle}`,
    text: `Dear ${p.clientName || 'Client'},

Your payment has been received and your booking request is awaiting consultant confirmation.

Service   : ${p.listingTitle}
Consultant: ${p.consultantName}
Date/Time : ${dateDisplay}
Duration  : ${fmtDuration(p.durationMinutes)}

You will receive a confirmation email as soon as the consultant approves your appointment.

In the meantime, you can track your booking in the client portal:
${APP_URL}/dashboard

Best regards,
Ki Business Solutions`,
  });
}

// ─── Client: booking confirmed by consultant ─────────────────────────────────

export async function sendClientBookingConfirmed(p: {
  clientEmail:      string;
  clientName:       string;
  consultantName:   string;
  consultantEmail:  string;
  listingTitle:     string;
  appointmentDate:  string;
  appointmentTime:  string;
  appointmentTimezone: string;
  durationMinutes:  number;
  meetLink?:        string;
}): Promise<void> {
  const dateDisplay = fmtDate(p.appointmentDate, p.appointmentTime, p.appointmentTimezone);
  const meetSection = p.meetLink ? `\nMeeting Link  : ${p.meetLink}` : '';

  await send({
    from: FROM,
    to:   p.clientEmail,
    subject: `Appointment Confirmed – ${p.listingTitle}`,
    text: `Dear ${p.clientName || 'Client'},

Your appointment has been confirmed!

Service   : ${p.listingTitle}
Consultant: ${p.consultantName} (${p.consultantEmail})
Date/Time : ${dateDisplay}
Duration  : ${fmtDuration(p.durationMinutes)}${meetSection}

Access your client portal for details and documents:
${APP_URL}/dashboard

Best regards,
Ki Business Solutions`,
  });
}
