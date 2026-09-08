import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';

export type NotificationsWorkflowAnalyticsAction =
  | 'notifications_history_opened'
  | 'notifications_retry_clicked'
  | 'notifications_load_more_clicked'
  | 'notification_opened'
  | 'notification_marked_read'
  | 'notifications_mark_all_read_confirmed'
  | 'notifications_mark_all_read_failed';

export interface NotificationsWorkflowAnalyticsInput {
  userId?: string | null;
  action: NotificationsWorkflowAnalyticsAction;
  notificationId?: string;
  notificationType?: string;
  notificationKind?: string;
  digestFrequency?: string;
  digestItemIds?: string[];
  digestItemCount?: number;
  digestTotalNewMatches?: number;
  actionUrl?: string;
  isDigestClick?: boolean;
  unreadCount?: number;
  loadedCount?: number;
  errorCategory?: string;
}

const getEventName = (action: NotificationsWorkflowAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'notifications_retry_clicked':
      return 'error_recovery_clicked';
    case 'notifications_mark_all_read_confirmed':
      return 'bulk_action_confirmed';
    case 'notifications_mark_all_read_failed':
      return 'task_failed';
    case 'notification_opened':
    case 'notification_marked_read':
      return 'task_completed';
    case 'notifications_history_opened':
    case 'notifications_load_more_clicked':
    default:
      return 'task_started';
  }
};

export const recordNotificationsWorkflowAnalytics = ({
  userId,
  action,
  notificationId,
  notificationType,
  notificationKind,
  digestFrequency,
  digestItemIds,
  digestItemCount,
  digestTotalNewMatches,
  actionUrl,
  isDigestClick,
  unreadCount,
  loadedCount,
  errorCategory,
}: NotificationsWorkflowAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'notifications',
    eventName: getEventName(action),
    source: 'notifications_center',
    objectType: action === 'notification_opened' || action === 'notification_marked_read'
      ? 'notification'
      : 'notification_center',
    objectId: notificationId,
    metadata: {
      action,
      notificationType,
      notificationKind,
      digestFrequency,
      digestItemIds,
      digestItemCount,
      digestTotalNewMatches,
      actionUrl,
      isDigestClick,
      unreadCount,
      loadedCount,
      errorCategory,
      userControl: 'explicit',
      mutationScope: 'notification_history',
    },
  });
};
