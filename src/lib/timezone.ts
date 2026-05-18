/**
 * Timezone utilities for appointment display.
 * Converts appointment times between consultant and client timezones.
 */

export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getTimezoneAbbreviation(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timezone;
  } catch {
    return timezone;
  }
}

export function convertTime(
  isoDateStr: string,
  timeStr: string,
  fromTimezone: string,
  toTimezone: string
): string {
  try {
    const dateTime = new Date(`${isoDateStr.slice(0, 10)}T${timeStr}:00`);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: toTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dateTime);
  } catch {
    return timeStr;
  }
}

export function formatAppointmentDateTime(
  isoDate: string,
  time: string,
  consultantTimezone: string,
  clientTimezone: string
): { consultantDisplay: string; clientDisplay: string; isSameZone: boolean } {
  const consultantAbbr = getTimezoneAbbreviation(consultantTimezone);
  const clientAbbr     = getTimezoneAbbreviation(clientTimezone);
  const isSameZone     = consultantTimezone === clientTimezone;

  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: clientTimezone,
    day:   '2-digit',
    month: 'long',
    year:  'numeric',
  };

  try {
    const dt = new Date(isoDate);
    const dateStr = new Intl.DateTimeFormat('tr-TR', dateOptions).format(dt);
    const clientTime = convertTime(isoDate, time, consultantTimezone, clientTimezone);

    return {
      consultantDisplay: `${dateStr} ${time} (${consultantAbbr})`,
      clientDisplay:     `${dateStr} ${clientTime} (${clientAbbr})`,
      isSameZone,
    };
  } catch {
    return {
      consultantDisplay: `${isoDate} ${time} (${consultantAbbr})`,
      clientDisplay:     `${isoDate} ${time} (${clientAbbr})`,
      isSameZone,
    };
  }
}

export const POPULAR_TIMEZONES = [
  { value: 'Europe/Istanbul',   label: 'Istanbul (TRT, UTC+3)' },
  { value: 'Europe/London',     label: 'London (GMT/BST)' },
  { value: 'Europe/Paris',      label: 'Paris/Berlin (CET, UTC+1)' },
  { value: 'America/New_York',  label: 'New York (EST/EDT)' },
  { value: 'America/Chicago',   label: 'Chicago (CST/CDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT, UTC-3)' },
  { value: 'Asia/Dubai',        label: 'Dubai (GST, UTC+4)' },
  { value: 'Asia/Singapore',    label: 'Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo',        label: 'Tokyo (JST, UTC+9)' },
  { value: 'Australia/Sydney',  label: 'Sydney (AEDT/AEST)' },
  { value: 'UTC',               label: 'UTC' },
];
