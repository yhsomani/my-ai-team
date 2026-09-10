import { describe, expect, it } from 'vitest';
import {
  buildNotificationDeliverySummary,
  getLowerPriorityNotificationDelivery,
  normalizeNotificationDigestFrequency,
  normalizeNotificationQuietTime,
} from './notificationPreferences';

describe('notificationPreferences', () => {
  it('normalizes digest frequency to supported values', () => {
    expect(normalizeNotificationDigestFrequency('daily')).toBe('daily');
    expect(normalizeNotificationDigestFrequency('weekly')).toBe('weekly');
    expect(normalizeNotificationDigestFrequency('unknown')).toBe('immediate');
    expect(normalizeNotificationDigestFrequency(null)).toBe('immediate');
  });

  it('normalizes quiet-hour time strings', () => {
    expect(normalizeNotificationQuietTime('23:30', '18:00')).toBe('23:30');
    expect(normalizeNotificationQuietTime('23:30:00', '18:00')).toBe('23:30');
    expect(normalizeNotificationQuietTime('24:00', '18:00')).toBe('18:00');
    expect(normalizeNotificationQuietTime('9:00', '18:00')).toBe('18:00');
  });

  it('builds a visible delivery summary', () => {
    expect(buildNotificationDeliverySummary({
      digest_frequency: 'daily',
      quiet_hours_enabled: true,
      quiet_hours_start: '20:00',
      quiet_hours_end: '08:00',
    })).toMatchObject({
      digestFrequency: 'daily',
      digestLabel: 'Daily Digest',
      quietHoursEnabled: true,
      summary: 'Daily Digest; quiet hours 20:00-08:00',
    });
  });

  it('decides lower-priority notification delivery from digest and channel settings', () => {
    expect(getLowerPriorityNotificationDelivery({
      digestFrequency: 'immediate',
      channelEnabled: true,
    })).toBe('deliver_now');
    expect(getLowerPriorityNotificationDelivery({
      digestFrequency: 'off',
      channelEnabled: true,
    })).toBe('deliver_now');
    expect(getLowerPriorityNotificationDelivery({
      digestFrequency: 'daily',
      channelEnabled: true,
    })).toBe('defer_to_digest');
    expect(getLowerPriorityNotificationDelivery({
      digestFrequency: 'weekly',
      channelEnabled: true,
    })).toBe('defer_to_digest');
    expect(getLowerPriorityNotificationDelivery({
      digestFrequency: 'immediate',
      channelEnabled: false,
    })).toBe('suppressed');
  });
});
