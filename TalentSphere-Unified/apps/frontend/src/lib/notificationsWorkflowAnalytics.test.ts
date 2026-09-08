import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordNotificationsWorkflowAnalytics } from './notificationsWorkflowAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('notificationsWorkflowAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records notifications_history_opened with task_started event', () => {
    recordNotificationsWorkflowAnalytics({
      userId: 'usr-123',
      action: 'notifications_history_opened',
      unreadCount: 4,
      loadedCount: 15,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'usr-123',
      area: 'notifications',
      eventName: 'task_started',
      source: 'notifications_center',
      objectType: 'notification_center',
      objectId: undefined,
      metadata: {
        action: 'notifications_history_opened',
        notificationType: undefined,
        unreadCount: 4,
        loadedCount: 15,
        errorCategory: undefined,
        userControl: 'explicit',
        mutationScope: 'notification_history',
      },
    });
  });

  it('records error recovery when retry is clicked', () => {
    recordNotificationsWorkflowAnalytics({
      userId: 'usr-123',
      action: 'notifications_retry_clicked',
      errorCategory: 'NETWORK_TIMEOUT',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'error_recovery_clicked',
      metadata: expect.objectContaining({
        action: 'notifications_retry_clicked',
        errorCategory: 'NETWORK_TIMEOUT',
      }),
    }));
  });

  it('records bulk_action_confirmed when mark all read is confirmed', () => {
    recordNotificationsWorkflowAnalytics({
      userId: 'usr-123',
      action: 'notifications_mark_all_read_confirmed',
      unreadCount: 8,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'bulk_action_confirmed',
      metadata: expect.objectContaining({
        action: 'notifications_mark_all_read_confirmed',
        unreadCount: 8,
      }),
    }));
  });

  it('records task_failed when mark all read fails', () => {
    recordNotificationsWorkflowAnalytics({
      userId: 'usr-123',
      action: 'notifications_mark_all_read_failed',
      errorCategory: 'PERMISSION_DENIED',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_failed',
      metadata: expect.objectContaining({
        action: 'notifications_mark_all_read_failed',
        errorCategory: 'PERMISSION_DENIED',
      }),
    }));
  });

  it('records single notification interaction as notification objectType and task_completed', () => {
    recordNotificationsWorkflowAnalytics({
      userId: 'usr-123',
      action: 'notification_opened',
      notificationId: 'notif-456',
      notificationType: 'JOB_APPLICATION',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'notification',
      objectId: 'notif-456',
      metadata: expect.objectContaining({
        action: 'notification_opened',
        notificationType: 'JOB_APPLICATION',
      }),
    }));
  });

  it('records digest click-through with K-13 tracking metadata when a saved-search digest is opened', () => {
    recordNotificationsWorkflowAnalytics({
      userId: 'usr-123',
      action: 'notification_opened',
      notificationId: 'notif-digest-789',
      notificationType: 'JOB_ALERT',
      notificationKind: 'saved_search_digest',
      digestFrequency: 'daily',
      digestItemIds: ['item-1', 'item-2'],
      digestItemCount: 2,
      digestTotalNewMatches: 5,
      actionUrl: '/jobs',
      isDigestClick: true,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'usr-123',
      area: 'notifications',
      eventName: 'task_completed',
      source: 'notifications_center',
      objectType: 'notification',
      objectId: 'notif-digest-789',
      metadata: {
        action: 'notification_opened',
        notificationType: 'JOB_ALERT',
        notificationKind: 'saved_search_digest',
        digestFrequency: 'daily',
        digestItemIds: ['item-1', 'item-2'],
        digestItemCount: 2,
        digestTotalNewMatches: 5,
        actionUrl: '/jobs',
        isDigestClick: true,
        unreadCount: undefined,
        loadedCount: undefined,
        errorCategory: undefined,
        userControl: 'explicit',
        mutationScope: 'notification_history',
      },
    });
  });
});
