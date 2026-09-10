/**
 * Central Date Utilities (R-11 / QC-3 / QC-12)
 *
 * Provides timezone-safe parsing and formatting for dates across TalentSphere.
 * Eliminates UTC midnight drift where "2026-06-01" displays as "May 31" in timezones west of UTC.
 */

/**
 * Safely parses any date input into a valid Date instance.
 * For `YYYY-MM-DD` strings, constructs local midnight to avoid UTC negative offset shifts.
 * Returns `null` for invalid or missing inputs.
 */
export function parseDateInput(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const str = String(input).trim();
  if (!str) return null;

  // Handle YYYY-MM-DD specifically to avoid UTC midnight shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [yearStr, monthStr, dayStr] = str.split('-');
    const year = Number.parseInt(yearStr, 10);
    const month = Number.parseInt(monthStr, 10) - 1;
    const day = Number.parseInt(dayStr, 10);
    const localDate = new Date(year, month, day, 0, 0, 0, 0);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Returns true if the input represents a valid, parseable date.
 */
export function isValidDate(input: unknown): boolean {
  if (!input) return false;
  return parseDateInput(input as string | number | Date) !== null;
}

/**
 * Formats a date into a localized string with custom or default options.
 * Fallback string returned if input is invalid.
 */
export function formatDateDisplay(
  input: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
  fallback = 'N/A'
): string {
  const date = parseDateInput(input);
  if (!date) return fallback;
  try {
    return date.toLocaleDateString(undefined, options);
  } catch {
    return fallback;
  }
}

/**
 * Formats a date as "Mon YYYY" (e.g. "Jun 2026"), ideal for resume education/experience.
 */
export function formatMonthYear(
  input: string | number | Date | null | undefined,
  fallback = ''
): string {
  const date = parseDateInput(input);
  if (!date) return fallback;
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/**
 * Formats a date as `YYYY-MM-DD`, suitable for HTML `<input type="date" />`.
 */
export function formatDateInput(
  input: string | number | Date | null | undefined
): string {
  const date = parseDateInput(input);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date with timestamp (e.g. "Jun 25, 2:30 PM") for dashboard/activity feeds.
 */
export function formatDateTimeDisplay(
  input: string | number | Date | null | undefined,
  fallback = 'Not refreshed yet'
): string {
  const date = parseDateInput(input);
  if (!date) return fallback;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Returns human-readable relative time ("just now", "5m ago", "2h ago", "3d ago", "2mo ago", "1y ago").
 */
export function formatRelativeTime(
  input: string | number | Date | null | undefined,
  baseDate: Date = new Date(),
  fallback = 'N/A'
): string {
  const date = parseDateInput(input);
  if (!date) return fallback;

  const diffMs = baseDate.getTime() - date.getTime();
  if (diffMs < 0) {
    // Future date or slight clock skew
    return 'just now';
  }

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return 'just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

/**
 * Calculates the difference in full days between two dates.
 * Positive if `to` is after `from`.
 */
export function getDaysDifference(
  fromInput: string | number | Date | null | undefined,
  toInput: string | number | Date | null | undefined = new Date()
): number {
  const from = parseDateInput(fromInput);
  const to = parseDateInput(toInput);
  if (!from || !to) return 0;

  const diffMs = to.getTime() - from.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Checks if a given date is older than `days` threshold compared to `baseDate`.
 * Used for SLA warning triggers (e.g. 7-day recruiter idle SLA).
 */
export function isOlderThanDays(
  input: string | number | Date | null | undefined,
  days: number,
  baseDate: Date = new Date()
): boolean {
  const date = parseDateInput(input);
  if (!date) return false;
  return getDaysDifference(date, baseDate) >= days;
}
