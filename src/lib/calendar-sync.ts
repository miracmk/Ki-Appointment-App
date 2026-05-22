import axios from 'axios';
import { getConsultantProfile } from './marketplace';
import { decryptSensitiveData, encryptSensitiveData } from './encryption';
import { getAdminFirestore } from './firebase-admin';
import { Appointment, ConsultantProfile } from '@/types/marketplace';

/**
 * Refresh calendar access token using refresh token
 */
async function refreshCalendarAccessToken(
  consultantId: string,
  profile: ConsultantProfile
): Promise<string | null> {
  try {
    const { refresh_token_encrypted, refresh_token_iv, refresh_token_authTag, access_token_expiry } =
      profile.calendar_integration;

    if (!refresh_token_encrypted) {
      return null;
    }

    // Check if current token is still valid (within 5 minutes)
    if (access_token_expiry && access_token_expiry > Date.now() + 300000) {
      const { access_token_encrypted, access_token_iv, access_token_authTag } = profile.calendar_integration;
      if (access_token_encrypted) {
        return decryptSensitiveData(access_token_encrypted, access_token_iv!, access_token_authTag!);
      }
    }

    const refreshToken = decryptSensitiveData(refresh_token_encrypted, refresh_token_iv!, refresh_token_authTag!);

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.CALENDAR_CLIENT_ID,
      client_secret: process.env.CALENDAR_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const newAccessToken = response.data.access_token;
    const expiresIn = response.data.expires_in || 3600;

    // Update the consultant's profile with new access token
    const { encryptedData, iv, authTag } = encryptSensitiveData(newAccessToken);
    const db = getAdminFirestore();
    await db.collection('users').doc(consultantId).update({
      'calendar_integration.access_token_encrypted': encryptedData,
      'calendar_integration.access_token_iv': iv,
      'calendar_integration.access_token_authTag': authTag,
      'calendar_integration.access_token_expiry': Date.now() + expiresIn * 1000,
      'calendar_integration.updated_at': Date.now(),
    });

    return newAccessToken;
  } catch (error) {
    console.error(`Error refreshing calendar access token for consultant ${consultantId}:`, error);
    return null;
  }
}

/**
 * Add appointment to external calendar
 */
export async function syncToCalendar(
  consultantId: string,
  appointment: Appointment
): Promise<string | null> {
  try {
    const profile = await getConsultantProfile(consultantId);
    if (!profile?.calendar_integration?.connected) {
      console.warn(`Calendar not connected for consultant ${consultantId}`);
      return null;
    }

    let accessToken = await refreshCalendarAccessToken(consultantId, profile);
    if (!accessToken) {
      console.error(`Failed to get calendar access token for consultant ${consultantId}`);
      return null;
    }

    const calendarId = profile.calendar_integration.calendar_id || 'primary';

    // Parse appointment date and time
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}:00Z`);
    const endTime = new Date(appointmentDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    const event = {
      summary: `Consultation - ${appointment.customer_name || appointment.customer_email}`,
      description: `Package: ${appointment.package_id}\nCustomer: ${appointment.customer_email}`,
      start: {
        dateTime: appointmentDateTime.toISOString(),
        timeZone: appointment.appointment_timezone || 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: appointment.appointment_timezone || 'UTC',
      },
      attendees: [
        {
          email: appointment.customer_email,
          responseStatus: 'needsAction',
        },
      ],
    };

    const response = await axios.post(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      event,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.id;
  } catch (error) {
    console.error(`Error syncing to calendar for consultant ${consultantId}:`, error);
    return null;
  }
}

/**
 * Refresh Outlook access token using refresh token
 */
async function refreshOutlookAccessToken(
  consultantId: string,
  profile: ConsultantProfile
): Promise<string | null> {
  try {
    const { refresh_token_encrypted, refresh_token_iv, refresh_token_authTag, access_token_expiry } =
      profile.outlook_calendar;

    if (!refresh_token_encrypted) {
      return null;
    }

    // Check if current token is still valid (within 5 minutes)
    if (access_token_expiry && access_token_expiry > Date.now() + 300000) {
      const { access_token_encrypted, access_token_iv, access_token_authTag } = profile.outlook_calendar;
      if (access_token_encrypted) {
        return decryptSensitiveData(access_token_encrypted, access_token_iv!, access_token_authTag!);
      }
    }

    const refreshToken = decryptSensitiveData(refresh_token_encrypted, refresh_token_iv!, refresh_token_authTag!);

    const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      client_id: process.env.AZURE_AD_CLIENT_ID,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'Calendars.ReadWrite offline_access',
    });

    const newAccessToken = response.data.access_token;
    const expiresIn = response.data.expires_in || 3600;

    // Update the consultant's profile with new access token
    const { encryptedData, iv, authTag } = encryptSensitiveData(newAccessToken);
    const db = getAdminFirestore();
    await db.collection('users').doc(consultantId).update({
      'outlook_calendar.access_token_encrypted': encryptedData,
      'outlook_calendar.access_token_iv': iv,
      'outlook_calendar.access_token_authTag': authTag,
      'outlook_calendar.access_token_expiry': Date.now() + expiresIn * 1000,
      'outlook_calendar.updated_at': Date.now(),
    });

    return newAccessToken;
  } catch (error) {
    console.error(`Error refreshing Outlook access token for consultant ${consultantId}:`, error);
    return null;
  }
}

/**
 * Add appointment to Outlook Calendar
 */
export async function syncToOutlookCalendar(
  consultantId: string,
  appointment: Appointment
): Promise<string | null> {
  try {
    const profile = await getConsultantProfile(consultantId);
    if (!profile?.outlook_calendar?.connected) {
      console.warn(`Outlook Calendar not connected for consultant ${consultantId}`);
      return null;
    }

    let accessToken = await refreshOutlookAccessToken(consultantId, profile);
    if (!accessToken) {
      console.error(`Failed to get Outlook access token for consultant ${consultantId}`);
      return null;
    }

    // Parse appointment date and time
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}:00Z`);
    const endTime = new Date(appointmentDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    const event = {
      subject: `Consultation - ${appointment.customer_name || appointment.customer_email}`,
      body: {
        contentType: 'HTML',
        content: `Package: ${appointment.package_id}<br/>Customer: ${appointment.customer_email}`,
      },
      start: {
        dateTime: appointmentDateTime.toISOString(),
        timeZone: appointment.appointment_timezone || 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: appointment.appointment_timezone || 'UTC',
      },
      attendees: [
        {
          emailAddress: {
            address: appointment.customer_email,
            name: appointment.customer_name || 'Guest',
          },
          type: 'required',
        },
      ],
    };

    const response = await axios.post('https://graph.microsoft.com/v1.0/me/events', event, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data.id;
  } catch (error) {
    console.error(`Error syncing to Outlook Calendar for consultant ${consultantId}:`, error);
    return null;
  }
}

/**
 * Generate iCalendar (.ics) file for universal calendar support
 */
export function generateICS(appointment: Appointment, consultantEmail: string): string {
  const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}:00Z`);
  const endTime = new Date(appointmentDateTime.getTime() + 60 * 60 * 1000);

  const dtStart = appointmentDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dtEnd = endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `${appointment.id}@ki-appointments.local`;

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Ki Business Solutions//Appointments//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:Consultation - ${appointment.customer_name || appointment.customer_email}
DESCRIPTION:Package: ${appointment.package_id}\\nConsultant: ${consultantEmail}
ORGANIZER;CN=${consultantEmail}:mailto:${consultantEmail}
ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION:mailto:${appointment.customer_email}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}
