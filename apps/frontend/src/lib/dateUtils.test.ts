import { describe, expect, it } from 'vitest';
import {
  formatDateDisplay,
  formatDateInput,
  formatDateTimeDisplay,
  formatMonthYear,
  formatRelativeTime,
  getDaysDifference,
  isOlderThanDays,
  isValidDate,
  parseDateInput,
} from './dateUtils';

describe('dateUtils (R-11)', () => {
  describe('parseDateInput', () => {
    it('returns null for null, undefined, and empty string', () => {
      expect(parseDateInput(null)).toBeNull();
      expect(parseDateInput(undefined)).toBeNull();
      expect(parseDateInput('')).toBeNull();
      expect(parseDateInput('   ')).toBeNull();
    });

    it('parses YYYY-MM-DD as local midnight date without timezone drift', () => {
      const parsed = parseDateInput('2026-06-15');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2026);
      expect(parsed?.getMonth()).toBe(5); // June (0-indexed)
      expect(parsed?.getDate()).toBe(15);
      expect(parsed?.getHours()).toBe(0);
      expect(parsed?.getMinutes()).toBe(0);
    });

    it('parses valid Date instances', () => {
      const d = new Date('2026-08-30T10:00:00Z');
      const parsed = parseDateInput(d);
      expect(parsed).toBe(d);
    });

    it('returns null for invalid Date instances', () => {
      const invalid = new Date('invalid');
      expect(parseDateInput(invalid)).toBeNull();
    });

    it('parses numeric epoch timestamps', () => {
      const epoch = 1782297600000;
      const parsed = parseDateInput(epoch);
      expect(parsed).not.toBeNull();
      expect(parsed?.getTime()).toBe(epoch);
    });

    it('returns null for invalid strings', () => {
      expect(parseDateInput('not-a-date')).toBeNull();
    });
  });

  describe('isValidDate', () => {
    it('accurately identifies valid and invalid dates', () => {
      expect(isValidDate('2026-01-01')).toBe(true);
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(Date.now())).toBe(true);
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
    });
  });

  describe('formatDateDisplay & formatMonthYear', () => {
    it('formats display dates safely with fallbacks', () => {
      const date = '2026-06-15';
      const formatted = formatDateDisplay(date);
      expect(formatted).toMatch(/Jun/i);
      expect(formatted).toMatch(/2026/);

      expect(formatDateDisplay(null, undefined, 'No date')).toBe('No date');
    });

    it('formats month-year representation', () => {
      expect(formatMonthYear('2026-06-15')).toMatch(/Jun\s+2026/i);
      expect(formatMonthYear(null, 'Ongoing')).toBe('Ongoing');
    });
  });

  describe('formatDateInput', () => {
    it('formats Date into YYYY-MM-DD input string', () => {
      const d = new Date(2026, 7, 25); // Aug 25 2026
      expect(formatDateInput(d)).toBe('2026-08-25');
      expect(formatDateInput(null)).toBe('');
    });
  });

  describe('formatRelativeTime', () => {
    const base = new Date('2026-08-30T12:00:00Z');

    it('formats seconds/minutes relative times', () => {
      const tenSecAgo = new Date(base.getTime() - 10 * 1000);
      expect(formatRelativeTime(tenSecAgo, base)).toBe('just now');

      const fiveMinAgo = new Date(base.getTime() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinAgo, base)).toBe('5m ago');

      const twoHoursAgo = new Date(base.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo, base)).toBe('2h ago');
    });

    it('formats days/months/years relative times', () => {
      const yesterday = new Date(base.getTime() - 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(yesterday, base)).toBe('yesterday');

      const fiveDaysAgo = new Date(base.getTime() - 5 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(fiveDaysAgo, base)).toBe('5d ago');

      const twoMonthsAgo = new Date(base.getTime() - 65 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoMonthsAgo, base)).toBe('2mo ago');

      const twoYearsAgo = new Date(base.getTime() - 750 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoYearsAgo, base)).toBe('2y ago');
    });

    it('handles future or invalid dates', () => {
      const future = new Date(base.getTime() + 100000);
      expect(formatRelativeTime(future, base)).toBe('just now');
      expect(formatRelativeTime(null, base, 'N/A')).toBe('N/A');
    });
  });

  describe('getDaysDifference and isOlderThanDays', () => {
    const base = new Date('2026-08-30T12:00:00Z');

    it('calculates full day differences accurately', () => {
      const fourDaysAgo = new Date('2026-08-26T12:00:00Z');
      expect(getDaysDifference(fourDaysAgo, base)).toBe(4);
    });

    it('evaluates SLA threshold triggers (e.g. 7-day recruiter idle)', () => {
      const sixDaysAgo = new Date(base.getTime() - 6 * 24 * 60 * 60 * 1000);
      const eightDaysAgo = new Date(base.getTime() - 8 * 24 * 60 * 60 * 1000);

      expect(isOlderThanDays(sixDaysAgo, 7, base)).toBe(false);
      expect(isOlderThanDays(eightDaysAgo, 7, base)).toBe(true);
      expect(isOlderThanDays(null, 7, base)).toBe(false);
    });
  });
});
