// =====================================================================
// Timezone Utilities for DH Dining System
// Institutional Timezone: Asia/Kolkata (IST, UTC+05:30)
// =====================================================================

export const INSTITUTIONAL_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current timestamp formatted in Asia/Kolkata timezone
 */
export function getNowInInstitutionalTime(): Date {
  // Using Intl format to get the date parts in Asia/Kolkata
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: INSTITUTIONAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      partMap[part.type] = part.value;
    }
  }

  // Construct ISO string for IST
  const isoString = `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}+05:30`;
  return new Date(isoString);
}

/**
 * Formats a Date or ISO string into a human-readable 12-hour time in IST (e.g., "08:30 AM")
 */
export function formatTimeIST(dateOrIso: Date | string | null | undefined): string {
  if (!dateOrIso) return '--:--';
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) return '--:--';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: INSTITUTIONAL_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats a 24-hour time string ("08:30:00" or "08:30") to readable 12-hour time ("8:30 AM")
 */
export function formatTimeStringTo12H(timeStr: string | null | undefined): string {
  if (!timeStr) return '--:--';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return timeStr;

  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const displayMinutes = m < 10 ? `0${m}` : `${m}`;
  return `${displayHour}:${displayMinutes} ${period}`;
}

/**
 * Formats a Date or ISO string into an institutional date (e.g. "24 Sep 2026")
 */
export function formatDateIST(dateOrIso: Date | string | null | undefined): string {
  if (!dateOrIso) return '--';
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) return '--';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: INSTITUTIONAL_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Returns today's calendar date string in YYYY-MM-DD for Asia/Kolkata
 */
export function getTodayDateStringIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: INSTITUTIONAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Builds an ISO TIMESTAMPTZ string from a Date string ("YYYY-MM-DD") and a Time string ("HH:mm:ss") in Asia/Kolkata
 */
export function buildISTTimestamp(dateStr: string, timeStr: string): string {
  const cleanTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr}T${cleanTime}+05:30`;
}
