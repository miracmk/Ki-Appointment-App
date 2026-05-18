/**
 * Google Meet link auto-generation via Google Calendar API.
 * Uses a service account to create calendar events with conferenceData.
 *
 * Required env vars:
 *   GOOGLE_MEET_SERVICE_ACCOUNT_KEY  — JSON string of service account credentials
 *   GOOGLE_MEET_CALENDAR_ID          — calendar ID to attach events to (default: 'primary')
 */

import { google } from 'googleapis';

function getServiceAccountCredentials() {
  const raw = process.env.GOOGLE_MEET_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function createMeetLink(params: {
  title: string;
  startIso: string;
  endIso: string;
  attendeeEmails: string[];
  appointmentId: string;
}): Promise<string | null> {
  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    console.warn('GOOGLE_MEET_SERVICE_ACCOUNT_KEY not configured — skipping Meet creation');
    return null;
  }

  const calendarId = process.env.GOOGLE_MEET_CALENDAR_ID || 'primary';

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const event = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        summary: params.title,
        start:   { dateTime: params.startIso, timeZone: 'UTC' },
        end:     { dateTime: params.endIso,   timeZone: 'UTC' },
        attendees: params.attendeeEmails.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: params.appointmentId,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    return event.data?.conferenceData?.entryPoints?.[0]?.uri ?? null;
  } catch (err) {
    console.error('Google Meet creation failed:', err);
    return null;
  }
}
