import { describe, expect, it } from 'vitest';
import {
  buildNetworkingReminderBackfillPlan,
  defaultReminderDelay,
  getReminderDueAt,
  normalizeStoredReminders,
} from './networkingReminders';
import type { Connection } from '../types/networking';

const sentConnection: Connection = {
  id: 'connection-1',
  requesterId: 'user-1',
  receiverId: 'user-2',
  status: 'PENDING',
  createdAt: '2026-06-01T10:00:00.000Z',
  recipient: {
    id: 'user-2',
    fullName: 'Ada Lovelace',
  },
};

describe('networkingReminders', () => {
  it('normalizes legacy array reminder storage', () => {
    expect(normalizeStoredReminders(['connection-1'])).toEqual({
      'connection-1': {},
    });
  });

  it('normalizes object reminder storage with valid delay options', () => {
    expect(normalizeStoredReminders({
      'connection-1': {
        dueAt: '2026-06-04T09:00:00.000Z',
        delay: 'three-days',
      },
      'connection-2': {
        dueAt: '2026-06-05T09:00:00.000Z',
        delay: 'invalid',
      },
    })).toEqual({
      'connection-1': {
        dueAt: '2026-06-04T09:00:00.000Z',
        delay: 'three-days',
      },
      'connection-2': {
        dueAt: '2026-06-05T09:00:00.000Z',
        delay: undefined,
      },
    });
  });

  it('calculates due dates from the selected delay', () => {
    const threeDayReminder = new Date(getReminderDueAt(defaultReminderDelay, new Date('2026-06-01T14:30:00.000Z')));
    const tomorrowReminder = new Date(getReminderDueAt('tomorrow', new Date('2026-06-01T14:30:00.000Z')));

    expect(threeDayReminder.getDate()).toBe(4);
    expect(threeDayReminder.getHours()).toBe(9);
    expect(threeDayReminder.getMinutes()).toBe(0);
    expect(tomorrowReminder.getDate()).toBe(2);
    expect(tomorrowReminder.getHours()).toBe(9);
  });

  it('builds backfill items for valid local reminders on sent requests', () => {
    const plan = buildNetworkingReminderBackfillPlan({
      'connection-1': {
        dueAt: '2026-06-04T09:00:00.000Z',
        delay: 'three-days',
      },
    }, [sentConnection], 'user-1');

    expect(plan).toEqual([
      {
        connectionId: 'connection-1',
        recipientId: 'user-2',
        recipientName: 'Ada Lovelace',
        remindAt: '2026-06-04T09:00:00.000Z',
      },
    ]);
  });

  it('skips missing, malformed, and non-sent local reminders during backfill', () => {
    const plan = buildNetworkingReminderBackfillPlan({
      'connection-1': {},
      'connection-2': {
        dueAt: 'not-a-date',
      },
      'connection-3': {
        dueAt: '2026-06-04T09:00:00.000Z',
      },
    }, [
      sentConnection,
      {
        ...sentConnection,
        id: 'connection-2',
      },
    ], 'user-1');

    expect(plan).toEqual([]);
  });
});
