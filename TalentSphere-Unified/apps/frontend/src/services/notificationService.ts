import { apiClient } from '../api/axios';
import { supabase } from '../lib/supabaseClient';

export type NotificationType =
  | 'JOB_APPLICATION'
  | 'JOB_ALERT'
  | 'MESSAGE'
  | 'CONNECTION'
  | 'COURSE_UPDATE'
  | 'CHALLENGE'
  | 'ACHIEVEMENT'
  | 'SYSTEM';

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginatedNotificationsResult {
  notifications: NotificationRecord[];
  total: number | null;
  limit: number;
  offset: number;
  hasNext: boolean;
  nextCursor: string | null;
}

export interface SavedSearchAlertInput {
  savedSearchId: string;
  savedSearchName: string;
  newMatchCount: number;
  currentMatchCount: number;
  previousMatchCount: number;
}

export interface NetworkingReminderInput {
  connectionId: string;
  recipientId: string;
  recipientName?: string;
  remindAt?: string;
}

export const NOTIFICATIONS_CHANGED_EVENT = 'talentsphere.notifications.changed';
export type NotificationScheduleState = 'unscheduled' | 'scheduled' | 'due';

const localNotificationPrefix = 'talentsphere.notifications';

const getLocalNotificationKey = (userId: string) => `${localNotificationPrefix}.${userId}`;

const createNotificationId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const emitNotificationChange = (userId: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, { detail: { userId } }));
};

const normalizeMetadata = (value: unknown): Record<string, unknown> | undefined => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
);

export const getNotificationReminderDueAt = (notification: NotificationRecord): Date | null => {
  if (
    notification.metadata?.kind !== 'networking_follow_up_reminder' ||
    typeof notification.metadata?.remindAt !== 'string'
  ) {
    return null;
  }

  const dueAt = new Date(notification.metadata.remindAt);
  return Number.isNaN(dueAt.getTime()) ? null : dueAt;
};

export const getNotificationScheduleState = (
  notification: NotificationRecord,
  now = new Date()
): NotificationScheduleState => {
  const dueAt = getNotificationReminderDueAt(notification);
  if (!dueAt) return 'unscheduled';

  return dueAt.getTime() > now.getTime() ? 'scheduled' : 'due';
};

export const isNotificationUrgentUnread = (
  notification: NotificationRecord,
  now = new Date()
) => !notification.isRead && getNotificationScheduleState(notification, now) !== 'scheduled';

const mapNotificationResponse = (data: Record<string, any>): NotificationRecord => {
  const message = data.message || data.body || '';

  return {
    id: data.id,
    userId: data.user_id || data.userId || '',
    type: (data.type || 'SYSTEM') as NotificationType,
    title: data.title || message || 'Notification',
    message,
    isRead: Boolean(data.is_read ?? data.isRead ?? data.read),
    actionUrl: data.action_url || data.actionUrl || undefined,
    metadata: normalizeMetadata(data.metadata),
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
  };
};

const readLocalNotifications = (userId: string): NotificationRecord[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(getLocalNotificationKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is NotificationRecord => (
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.message === 'string' &&
        typeof item.createdAt === 'string'
      ))
      .slice(0, 20);
  } catch (error) {
    console.warn('[Notifications] local notification fallback unavailable.', error);
    return [];
  }
};

const writeLocalNotifications = (userId: string, notifications: NotificationRecord[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getLocalNotificationKey(userId), JSON.stringify(notifications.slice(0, 20)));
};

const mergeNotifications = (primary: NotificationRecord[], fallback: NotificationRecord[], limit: number) => {
  const seen = new Set<string>();

  return [...primary, ...fallback]
    .filter(notification => {
      if (seen.has(notification.id)) return false;
      seen.add(notification.id);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
};

const encodeNotificationCursor = (notification: NotificationRecord): string => {
  const payload = JSON.stringify({ createdAt: notification.createdAt, id: notification.id });
  return typeof btoa === 'function' ? btoa(payload) : encodeURIComponent(payload);
};

const decodeNotificationCursor = (cursor?: string): { createdAt: string; id: string } | null => {
  if (!cursor) return null;

  try {
    const payload = typeof atob === 'function' ? atob(cursor) : decodeURIComponent(cursor);
    const parsed = JSON.parse(payload);
    if (typeof parsed.createdAt === 'string' && typeof parsed.id === 'string') {
      return parsed;
    }
  } catch (error) {
    console.warn('[Notifications] Invalid notification cursor.', error);
  }

  throw new Error('Invalid notification cursor');
};

const sortNotifications = (notifications: NotificationRecord[]) => (
  [...notifications].sort((a, b) => {
    const timeDelta = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (timeDelta !== 0) return timeDelta;
    return b.id.localeCompare(a.id);
  })
);

const isNotificationAfterCursor = (
  notification: NotificationRecord,
  cursor: { createdAt: string; id: string }
) => (
  notification.createdAt < cursor.createdAt ||
  (notification.createdAt === cursor.createdAt && notification.id < cursor.id)
);

const paginateNotifications = (
  notifications: NotificationRecord[],
  options: { limit: number; offset: number; cursor?: { createdAt: string; id: string } | null }
) => {
  const sorted = sortNotifications(notifications);
  const filtered = options.cursor
    ? sorted.filter(notification => isNotificationAfterCursor(notification, options.cursor!))
    : sorted.slice(options.offset);
  const page = filtered.slice(0, options.limit);
  const hasNext = filtered.length > options.limit;
  const lastNotification = page[page.length - 1];

  return {
    notifications: page,
    hasNext,
    nextCursor: hasNext && lastNotification ? encodeNotificationCursor(lastNotification) : null,
  };
};

const upsertLocalNotification = (userId: string, notification: NotificationRecord) => {
  const current = readLocalNotifications(userId);
  const next = [
    notification,
    ...current.filter(item => item.id !== notification.id),
  ];

  writeLocalNotifications(userId, next);
  emitNotificationChange(userId);
  return notification;
};

const buildSavedSearchNotification = (
  userId: string,
  input: SavedSearchAlertInput,
  id = `saved-search-alert-${input.savedSearchId}`
): NotificationRecord => {
  const title = input.newMatchCount === 1
    ? '1 new saved-search match'
    : `${input.newMatchCount} new saved-search matches`;

  return {
    id,
    userId,
    type: 'JOB_ALERT',
    title,
    message: `${input.savedSearchName} now matches ${input.currentMatchCount} published jobs.`,
    isRead: false,
    actionUrl: '/jobs',
    metadata: {
      kind: 'saved_search_alert',
      savedSearchId: input.savedSearchId,
      savedSearchName: input.savedSearchName,
      newMatchCount: input.newMatchCount,
      currentMatchCount: input.currentMatchCount,
      previousMatchCount: input.previousMatchCount,
    },
    createdAt: new Date().toISOString(),
  };
};

const buildNetworkingReminderNotification = (
  userId: string,
  input: NetworkingReminderInput,
  id = `networking-reminder-${input.connectionId}`
): NotificationRecord => {
  const recipientName = input.recipientName?.trim() || 'this connection';
  const reminderDate = input.remindAt ? new Date(input.remindAt) : null;
  const reminderDateLabel = reminderDate && !Number.isNaN(reminderDate.getTime())
    ? reminderDate.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    : '';

  return {
    id,
    userId,
    type: 'CONNECTION',
    title: 'Connection follow-up reminder',
    message: reminderDateLabel
      ? `Follow up with ${recipientName} on ${reminderDateLabel} about your pending connection request.`
      : `Follow up with ${recipientName} about your pending connection request.`,
    isRead: false,
    actionUrl: '/networking',
    metadata: {
      kind: 'networking_follow_up_reminder',
      connectionId: input.connectionId,
      recipientId: input.recipientId,
      recipientName,
      ...(input.remindAt ? { remindAt: input.remindAt } : {}),
    },
    createdAt: new Date().toISOString(),
  };
};

export const notificationService = {
  getNotificationsPage: async (
    userId: string,
    options?: { limit?: number; offset?: number; cursor?: string }
  ): Promise<PaginatedNotificationsResult> => {
    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;
    const decodedCursor = decodeNotificationCursor(options?.cursor);
    const localNotifications = readLocalNotifications(userId);

    try {
      let query = decodedCursor
        ? supabase.from('notifications').select('*')
        : supabase.from('notifications').select('*', { count: 'exact' });

      query = query
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

      if (decodedCursor) {
        query = query
          .or(`created_at.lt.${decodedCursor.createdAt},and(created_at.eq.${decodedCursor.createdAt},id.lt.${decodedCursor.id})`)
          .limit(limit + 1);
      } else {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const mappedNotifications = (data || []).map(mapNotificationResponse);
      const notifications = decodedCursor
        ? mappedNotifications.slice(0, limit)
        : offset === 0
          ? mergeNotifications(mappedNotifications, localNotifications, limit)
          : mappedNotifications;
      const total = decodedCursor ? null : typeof count === 'number'
        ? Math.max(count, offset === 0 ? localNotifications.length : 0)
        : null;
      const hasNext = decodedCursor
        ? mappedNotifications.length > limit
        : total !== null
          ? offset + notifications.length < total
          : notifications.length === limit;
      const lastNotification = notifications[notifications.length - 1];

      return {
        notifications,
        total,
        limit,
        offset,
        hasNext,
        nextCursor: hasNext && lastNotification ? encodeNotificationCursor(lastNotification) : null
      };
    } catch (supabaseError) {
      console.warn('[Notifications] Supabase notifications unavailable; trying notification service fallback.', supabaseError);

      try {
        const response = await apiClient.get(`/api/v1/notifications/user/${userId}`, {
          params: {
            limit: decodedCursor ? limit + 1 : limit,
            ...(decodedCursor ? { cursor: options?.cursor } : { offset })
          }
        });
        const payload = response.data?.data || response.data || [];
        const rawNotifications = Array.isArray(payload) ? payload : payload.content || payload.notifications || [];
        const total = typeof response.data?.total === 'number'
          ? response.data.total
          : typeof response.data?.totalElements === 'number'
            ? response.data.totalElements
            : null;
        const mappedNotifications = rawNotifications.map(mapNotificationResponse);
        const paged = decodedCursor
          ? paginateNotifications(mappedNotifications, { limit, offset, cursor: decodedCursor })
          : null;
        const notifications = paged
          ? paged.notifications
          : offset === 0
            ? mergeNotifications(mappedNotifications, localNotifications, limit)
            : mappedNotifications.slice(0, limit);
        const hasNext = paged
          ? paged.hasNext
          : total !== null
            ? offset + notifications.length < total
            : notifications.length === limit;
        const lastNotification = notifications[notifications.length - 1];

        return {
          notifications,
          total: decodedCursor ? null : total,
          limit,
          offset,
          hasNext,
          nextCursor: paged?.nextCursor || (hasNext && lastNotification ? encodeNotificationCursor(lastNotification) : null)
        };
      } catch (apiError) {
        console.warn('[Notifications] Notification service unavailable; using local notifications.', apiError);
        const paged = paginateNotifications(localNotifications, { limit, offset, cursor: decodedCursor });
        return {
          notifications: paged.notifications,
          total: decodedCursor ? null : localNotifications.length,
          limit,
          offset,
          hasNext: paged.hasNext,
          nextCursor: paged.nextCursor
        };
      }
    }
  },

  getNotifications: async (userId: string, limit = 10): Promise<NotificationRecord[]> => {
    const page = await notificationService.getNotificationsPage(userId, { limit, offset: 0 });
    return page.notifications;
  },

  upsertSavedSearchAlertNotification: async (
    userId: string,
    input: SavedSearchAlertInput
  ): Promise<NotificationRecord> => {
    const fallbackNotification = buildSavedSearchNotification(userId, input);

    try {
      const { data: existing, error: existingError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .contains('metadata', { kind: 'saved_search_alert', savedSearchId: input.savedSearchId })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      const payload = {
        user_id: userId,
        type: 'JOB_ALERT',
        title: fallbackNotification.title,
        message: fallbackNotification.message,
        is_read: false,
        action_url: fallbackNotification.actionUrl,
        metadata: fallbackNotification.metadata,
      };

      const result = existing?.id
        ? await supabase
            .from('notifications')
            .update(payload)
            .eq('user_id', userId)
            .eq('id', existing.id)
            .select()
            .single()
        : await supabase
            .from('notifications')
            .insert([{ id: createNotificationId(), ...payload }])
            .select()
            .single();

      if (result.error) throw result.error;

      const notification = mapNotificationResponse(result.data);
      emitNotificationChange(userId);
      return notification;
    } catch (error) {
      console.warn('[Notifications] Saved-search notification stored locally only.', error);
      return upsertLocalNotification(userId, fallbackNotification);
    }
  },

  upsertNetworkingReminderNotification: async (
    userId: string,
    input: NetworkingReminderInput
  ): Promise<NotificationRecord> => {
    const fallbackNotification = buildNetworkingReminderNotification(userId, input);

    try {
      const { data: existing, error: existingError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .contains('metadata', { kind: 'networking_follow_up_reminder', connectionId: input.connectionId })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      const payload = {
        user_id: userId,
        type: 'CONNECTION',
        title: fallbackNotification.title,
        message: fallbackNotification.message,
        is_read: false,
        action_url: fallbackNotification.actionUrl,
        metadata: fallbackNotification.metadata,
      };

      const result = existing?.id
        ? await supabase
            .from('notifications')
            .update(payload)
            .eq('user_id', userId)
            .eq('id', existing.id)
            .select()
            .single()
        : await supabase
            .from('notifications')
            .insert([{ id: createNotificationId(), ...payload }])
            .select()
            .single();

      if (result.error) throw result.error;

      const notification = mapNotificationResponse(result.data);
      emitNotificationChange(userId);
      return notification;
    } catch (error) {
      console.warn('[Notifications] Networking reminder notification stored locally only.', error);
      return upsertLocalNotification(userId, fallbackNotification);
    }
  },

  clearNetworkingReminderNotification: async (
    userId: string,
    connectionId: string
  ): Promise<void> => {
    const localNotifications = readLocalNotifications(userId);
    if (localNotifications.length > 0) {
      writeLocalNotifications(userId, localNotifications.map(notification => (
        notification.id === `networking-reminder-${connectionId}` ||
        (
          notification.metadata?.kind === 'networking_follow_up_reminder' &&
          notification.metadata?.connectionId === connectionId
        )
          ? { ...notification, isRead: true }
          : notification
      )));
      emitNotificationChange(userId);
    }

    try {
      const { data: existing, error: existingError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('is_read', false)
        .contains('metadata', { kind: 'networking_follow_up_reminder', connectionId })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;
      if (!existing?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('id', existing.id);

      if (error) throw error;
      emitNotificationChange(userId);
    } catch (error) {
      console.warn('[Notifications] Networking reminder notification clear used local fallback only.', error);
    }
  },

  markNotificationRead: async (userId: string, notificationId: string): Promise<void> => {
    const localNotifications = readLocalNotifications(userId);
    if (localNotifications.some(notification => notification.id === notificationId)) {
      writeLocalNotifications(userId, localNotifications.map(notification => (
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )));
      emitNotificationChange(userId);
    }

    if (!isUuid(notificationId)) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }

    emitNotificationChange(userId);
  },

  markAllRead: async (userId: string): Promise<void> => {
    const localNotifications = readLocalNotifications(userId);
    if (localNotifications.length > 0) {
      writeLocalNotifications(userId, localNotifications.map(notification => ({ ...notification, isRead: true })));
      emitNotificationChange(userId);
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new Error(`Failed to mark notifications as read: ${error.message}`);
    }

    emitNotificationChange(userId);
  },
};
