import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/axios';
import { typedSupabase } from '../lib/supabaseClient';
import {
  getNotificationReminderDueAt,
  getNotificationScheduleState,
  isNotificationUrgentUnread,
  notificationService,
} from './notificationService';

vi.mock('../api/axios', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock('../lib/supabaseClient', () => {
  const client = {
    from: vi.fn(),
  };

  return {
    supabase: client,
    typedSupabase: client,
  };
});

describe('notificationService', () => {
  let queryBuilder: any;
  let localStorageData: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageData = {};
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => localStorageData[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageData[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageData[key];
        }),
      },
    });

    queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'notification-new',
          user_id: 'user-1',
          type: 'CONNECTION',
          title: 'Connection follow-up reminder',
          message: 'Follow up with Ada Lovelace about your pending connection request.',
          is_read: false,
          action_url: '/networking',
          metadata: {
            kind: 'networking_follow_up_reminder',
            connectionId: 'connection-1',
            recipientId: 'user-2',
            recipientName: 'Ada Lovelace',
          },
          created_at: '2026-06-01T10:00:00.000Z',
        },
        error: null,
      }),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      range: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'notification-1',
            user_id: 'user-1',
            type: 'JOB_ALERT',
            title: 'New match',
            message: 'A saved search has new matches.',
            is_read: false,
            action_url: '/jobs',
            created_at: '2026-06-01T10:00:00.000Z',
            metadata: { kind: 'saved_search_alert' },
          },
        ],
        error: null,
        count: 12,
      }),
    };

    (typedSupabase.from as any).mockReturnValue(queryBuilder);
    (apiClient.get as any).mockRejectedValue(new Error('API unavailable'));
  });

  it('returns paginated notification metadata from Supabase', async () => {
    const result = await notificationService.getNotificationsPage('user-1', {
      limit: 4,
      offset: 4,
    });

    expect(typedSupabase.from).toHaveBeenCalledWith('notifications');
    expect(queryBuilder.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(queryBuilder.order).toHaveBeenCalledWith('id', { ascending: false });
    expect(queryBuilder.range).toHaveBeenCalledWith(4, 7);
    expect(result.total).toBe(12);
    expect(result.limit).toBe(4);
    expect(result.offset).toBe(4);
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toEqual(expect.any(String));
    expect(result.notifications[0]).toMatchObject({
      id: 'notification-1',
      userId: 'user-1',
      title: 'New match',
      isRead: false,
      actionUrl: '/jobs',
    });
  });

  it('preserves array return shape for getNotifications', async () => {
    const result = await notificationService.getNotifications('user-1', 2);

    expect(Array.isArray(result)).toBe(true);
    expect(queryBuilder.range).toHaveBeenCalledWith(0, 1);
    expect(result[0].id).toBe('notification-1');
  });

  it('paginates local fallback notifications when server paths fail', async () => {
    queryBuilder.range.mockResolvedValueOnce({ data: null, error: new Error('Supabase unavailable') });
    window.localStorage.setItem('talentsphere.notifications.user-1', JSON.stringify([
      {
        id: 'local-1',
        userId: 'user-1',
        type: 'SYSTEM',
        title: 'First local',
        message: 'First',
        isRead: false,
        createdAt: '2026-06-02T10:00:00.000Z',
      },
      {
        id: 'local-2',
        userId: 'user-1',
        type: 'SYSTEM',
        title: 'Second local',
        message: 'Second',
        isRead: true,
        createdAt: '2026-06-01T10:00:00.000Z',
      },
    ]));

    const result = await notificationService.getNotificationsPage('user-1', {
      limit: 1,
      offset: 1,
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/notifications/user/user-1', {
      params: { limit: 1, offset: 1 },
    });
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].id).toBe('local-2');
    expect(result.total).toBe(2);
    expect(result.hasNext).toBe(false);
  });

  it('keeps totals unknown when cursor pagination falls back to local notifications', async () => {
    const firstPage = await notificationService.getNotificationsPage('user-1', {
      limit: 1,
      offset: 0,
    });
    queryBuilder.limit.mockResolvedValueOnce({ data: null, error: new Error('Supabase unavailable') });
    window.localStorage.setItem('talentsphere.notifications.user-1', JSON.stringify([
      {
        id: 'local-older',
        userId: 'user-1',
        type: 'SYSTEM',
        title: 'Older local',
        message: 'Older',
        isRead: false,
        createdAt: '2026-05-30T10:00:00.000Z',
      },
    ]));

    const result = await notificationService.getNotificationsPage('user-1', {
      limit: 1,
      cursor: firstPage.nextCursor || undefined,
    });

    expect(apiClient.get).toHaveBeenLastCalledWith('/api/v1/notifications/user/user-1', {
      params: { limit: 2, cursor: firstPage.nextCursor },
    });
    expect(result.notifications[0].id).toBe('local-older');
    expect(result.total).toBeNull();
    expect(result.hasNext).toBe(false);
  });

  it('uses cursor lookahead for stable notification pagination', async () => {
    const firstPage = await notificationService.getNotificationsPage('user-1', {
      limit: 1,
      offset: 0,
    });

    queryBuilder.limit.mockResolvedValueOnce({
      data: [
        {
          id: 'notification-0',
          user_id: 'user-1',
          type: 'SYSTEM',
          title: 'Older notification',
          message: 'Older',
          is_read: false,
          created_at: '2026-05-31T10:00:00.000Z',
        },
        {
          id: 'notification-overflow',
          user_id: 'user-1',
          type: 'SYSTEM',
          title: 'Overflow notification',
          message: 'Overflow',
          is_read: true,
          created_at: '2026-05-30T10:00:00.000Z',
        },
      ],
      error: null,
    });

    const result = await notificationService.getNotificationsPage('user-1', {
      limit: 1,
      cursor: firstPage.nextCursor || undefined,
    });

    expect(queryBuilder.select).toHaveBeenLastCalledWith('*');
    expect(queryBuilder.or).toHaveBeenCalledWith('created_at.lt.2026-06-01T10:00:00.000Z,and(created_at.eq.2026-06-01T10:00:00.000Z,id.lt.notification-1)');
    expect(queryBuilder.limit).toHaveBeenCalledWith(2);
    expect(queryBuilder.range).toHaveBeenCalledTimes(1);
    expect(result.total).toBeNull();
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].id).toBe('notification-0');
    expect(result.hasNext).toBe(true);
    expect(result.nextCursor).toEqual(expect.any(String));
  });

  it('keeps future networking reminders visible but out of urgent unread counts', () => {
    const notification = {
      id: 'networking-reminder-connection-1',
      userId: 'user-1',
      type: 'CONNECTION' as const,
      title: 'Connection follow-up reminder',
      message: 'Follow up later.',
      isRead: false,
      actionUrl: '/networking',
      createdAt: '2026-06-01T10:00:00.000Z',
      metadata: {
        kind: 'networking_follow_up_reminder',
        connectionId: 'connection-1',
        remindAt: '2026-06-04T09:00:00.000Z',
      },
    };

    expect(getNotificationScheduleState(notification, new Date('2026-06-03T09:00:00.000Z'))).toBe('scheduled');
    expect(isNotificationUrgentUnread(notification, new Date('2026-06-03T09:00:00.000Z'))).toBe(false);
    expect(getNotificationReminderDueAt(notification)?.toISOString()).toBe('2026-06-04T09:00:00.000Z');
  });

  it('counts due networking reminders as urgent unread notifications', () => {
    const notification = {
      id: 'networking-reminder-connection-1',
      userId: 'user-1',
      type: 'CONNECTION' as const,
      title: 'Connection follow-up reminder',
      message: 'Follow up now.',
      isRead: false,
      actionUrl: '/networking',
      createdAt: '2026-06-01T10:00:00.000Z',
      metadata: {
        kind: 'networking_follow_up_reminder',
        connectionId: 'connection-1',
        remindAt: '2026-06-04T09:00:00.000Z',
      },
    };

    expect(getNotificationScheduleState(notification, new Date('2026-06-04T09:00:00.000Z'))).toBe('due');
    expect(isNotificationUrgentUnread(notification, new Date('2026-06-04T09:00:00.000Z'))).toBe(true);
  });

  it('creates a networking reminder notification in Supabase', async () => {
    queryBuilder.limit.mockReturnValueOnce(queryBuilder);

    const result = await notificationService.upsertNetworkingReminderNotification('user-1', {
      connectionId: 'connection-1',
      recipientId: 'user-2',
      recipientName: 'Ada Lovelace',
    });

    expect(typedSupabase.from).toHaveBeenCalledWith('notifications');
    expect(queryBuilder.select).toHaveBeenCalledWith('*');
    expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(queryBuilder.eq).toHaveBeenCalledWith('is_read', false);
    expect(queryBuilder.contains).toHaveBeenCalledWith('metadata', {
      kind: 'networking_follow_up_reminder',
      connectionId: 'connection-1',
    });
    expect(queryBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-1',
        type: 'CONNECTION',
        title: 'Connection follow-up reminder',
        action_url: '/networking',
        metadata: expect.objectContaining({
          kind: 'networking_follow_up_reminder',
          connectionId: 'connection-1',
          recipientId: 'user-2',
          recipientName: 'Ada Lovelace',
        }),
      }),
    ]);
    expect(result).toMatchObject({
      id: 'notification-new',
      userId: 'user-1',
      type: 'CONNECTION',
      title: 'Connection follow-up reminder',
      isRead: false,
      actionUrl: '/networking',
    });
  });

  it('includes selected networking reminder timing in notification metadata', async () => {
    queryBuilder.limit.mockReturnValueOnce(queryBuilder);

    await notificationService.upsertNetworkingReminderNotification('user-1', {
      connectionId: 'connection-1',
      recipientId: 'user-2',
      recipientName: 'Ada Lovelace',
      remindAt: '2026-06-04T09:00:00.000Z',
    });

    expect(queryBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        message: expect.stringContaining('Ada Lovelace'),
        metadata: expect.objectContaining({
          kind: 'networking_follow_up_reminder',
          connectionId: 'connection-1',
          recipientId: 'user-2',
          recipientName: 'Ada Lovelace',
          remindAt: '2026-06-04T09:00:00.000Z',
        }),
      }),
    ]);
  });

  it('stores networking reminder notification locally when Supabase is unavailable', async () => {
    queryBuilder.limit.mockReturnValueOnce(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: new Error('Supabase unavailable') });

    const result = await notificationService.upsertNetworkingReminderNotification('user-1', {
      connectionId: 'connection-1',
      recipientId: 'user-2',
      recipientName: 'Ada Lovelace',
    });

    expect(result.id).toBe('networking-reminder-connection-1');
    expect(result.type).toBe('CONNECTION');
    expect(result.metadata).toMatchObject({
      kind: 'networking_follow_up_reminder',
      connectionId: 'connection-1',
      recipientId: 'user-2',
    });

    const localNotifications = JSON.parse(localStorageData['talentsphere.notifications.user-1']);
    expect(localNotifications[0]).toMatchObject({
      id: 'networking-reminder-connection-1',
      isRead: false,
    });
  });

  it('marks networking reminder notifications read when cleared', async () => {
    window.localStorage.setItem('talentsphere.notifications.user-1', JSON.stringify([
      {
        id: 'networking-reminder-connection-1',
        userId: 'user-1',
        type: 'CONNECTION',
        title: 'Connection follow-up reminder',
        message: 'Follow up.',
        isRead: false,
        createdAt: '2026-06-01T10:00:00.000Z',
        metadata: {
          kind: 'networking_follow_up_reminder',
          connectionId: 'connection-1',
        },
      },
    ]));
    queryBuilder.limit.mockReturnValueOnce(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'notification-existing' },
      error: null,
    });
    queryBuilder.update.mockReturnValue(queryBuilder);

    await notificationService.clearNetworkingReminderNotification('user-1', 'connection-1');

    const localNotifications = JSON.parse(localStorageData['talentsphere.notifications.user-1']);
    expect(localNotifications[0].isRead).toBe(true);
    expect(queryBuilder.update).toHaveBeenCalledWith({ is_read: true });
    expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'notification-existing');
  });
});
