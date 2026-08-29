import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  Check,
  GraduationCap,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import {
  getNotificationReminderDueAt,
  getNotificationScheduleState,
  isNotificationUrgentUnread,
  notificationService,
  NOTIFICATIONS_CHANGED_EVENT,
} from '../../services/notificationService';
import type { NotificationRecord, PaginatedNotificationsResult } from '../../services/notificationService';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/shared/AuraButton';
import { Tabs } from '../../components/shared/Tabs';
import { EmptyState } from '../../components/shared/EmptyState';
import { Skeleton } from '../../components/shared/Skeleton';
import { recordNotificationsWorkflowAnalytics } from '../../lib/notificationsWorkflowAnalytics';

const notificationsPageSize = 15;

type NotificationFilter = 'all' | 'unread';

const decorativeIconProps = { 'aria-hidden': true, focusable: 'false' as const };

const notificationTypeMeta: Record<string, { label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  JOB_APPLICATION: { label: 'Application', Icon: Briefcase },
  JOB_ALERT: { label: 'Job alert', Icon: Bell },
  MESSAGE: { label: 'Message', Icon: MessageSquare },
  CONNECTION: { label: 'Network', Icon: UserRound },
  COURSE_UPDATE: { label: 'Learning', Icon: GraduationCap },
  CHALLENGE: { label: 'Challenge', Icon: Trophy },
  ACHIEVEMENT: { label: 'Achievement', Icon: Sparkles },
  SYSTEM: { label: 'System', Icon: ShieldCheck },
};

const getNotificationTypeMeta = (type: string) => (
  notificationTypeMeta[type] || notificationTypeMeta.SYSTEM
);

const formatRelativeTime = (value: string, now: Date) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const diffMinutes = Math.round((now.getTime() - parsed.getTime()) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatAbsoluteTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const mergeNotificationPages = (
  previous: NotificationRecord[],
  incoming: NotificationRecord[],
): NotificationRecord[] => {
  const byId = new Map<string, NotificationRecord>();
  [...previous, ...incoming].forEach(notification => byId.set(notification.id, notification));

  return Array.from(byId.values()).sort((left, right) => {
    const timeDelta = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    if (timeDelta !== 0) return timeDelta;
    return right.id.localeCompare(left.id);
  });
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id;

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [metadata, setMetadata] = useState<PaginatedNotificationsResult['metadata'] | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setNextCursor(null);
      setHasMore(false);
      setMetadata(null);
      setIsLoading(false);
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const page = await notificationService.getNotificationsPage(userId, {
        limit: notificationsPageSize,
        offset: 0,
      });
      setNotifications(page.notifications);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasNext && Boolean(page.nextCursor));
      setMetadata(page.metadata);
    } catch (loadError) {
      console.warn('[NotificationsCenter] Unable to load notifications:', loadError);
      setError('Notifications could not load. Retry to reload your history.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (userId) {
      recordNotificationsWorkflowAnalytics({ userId, action: 'notifications_history_opened' });
    }
  }, [userId]);

  useEffect(() => {
    const handleNotificationChange = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!userId || detail?.userId === userId) {
        void loadNotifications();
      }
    };

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationChange);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationChange);
  }, [loadNotifications, userId]);

  const unreadCount = useMemo(
    () => notifications.filter(notification => isNotificationUrgentUnread(notification, now)).length,
    [notifications, now],
  );

  const visibleNotifications = useMemo(() => (
    filter === 'unread'
      ? notifications.filter(notification => !notification.isRead)
      : notifications
  ), [filter, notifications]);

  const sourceLabel = metadata?.source === 'account'
    ? 'Account sync'
    : metadata?.source === 'notification-api'
      ? 'Notification API fallback'
      : metadata?.source === 'local-fallback'
        ? 'Local browser fallback'
        : null;

  const handleLoadMore = async () => {
    if (!userId || isLoadingMore || !nextCursor) return;

    setIsLoadingMore(true);
    setError('');
    try {
      const page = await notificationService.getNotificationsPage(userId, {
        limit: notificationsPageSize,
        cursor: nextCursor,
      });
      setNotifications(previous => mergeNotificationPages(previous, page.notifications));
      setNextCursor(page.nextCursor);
      setHasMore(page.hasNext && Boolean(page.nextCursor));
      setMetadata(page.metadata);
      recordNotificationsWorkflowAnalytics({
        userId,
        action: 'notifications_load_more_clicked',
        loadedCount: page.notifications.length,
      });
    } catch (loadMoreError) {
      console.warn('[NotificationsCenter] Unable to load more notifications:', loadMoreError);
      setError('Older notifications could not load. Retry available.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const markNotificationReadLocally = (notificationId: string) => {
    setNotifications(previous => previous.map(item => (
      item.id === notificationId ? { ...item, isRead: true } : item
    )));
  };

  const handleOpenNotification = async (notification: NotificationRecord) => {
    if (userId && !notification.isRead) {
      markNotificationReadLocally(notification.id);

      try {
        await notificationService.markNotificationRead(userId, notification.id);
      } catch (markError) {
        console.warn('[NotificationsCenter] Unable to mark notification as read:', markError);
      }
    }

    recordNotificationsWorkflowAnalytics({
      userId,
      action: 'notification_opened',
      notificationId: notification.id,
      notificationType: notification.type,
    });

    navigate(notification.actionUrl || '/dashboard');
  };

  const handleMarkSingleRead = async (notification: NotificationRecord) => {
    if (!userId || notification.isRead) return;

    const previousIsRead = notification.isRead;
    markNotificationReadLocally(notification.id);

    try {
      await notificationService.markNotificationRead(userId, notification.id);
      recordNotificationsWorkflowAnalytics({
        userId,
        action: 'notification_marked_read',
        notificationId: notification.id,
        notificationType: notification.type,
      });
    } catch (markError) {
      console.warn('[NotificationsCenter] Unable to mark notification as read:', markError);
      setNotifications(previous => previous.map(item => (
        item.id === notification.id ? { ...item, isRead: previousIsRead } : item
      )));
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId || unreadCount === 0) return;

    const previousNotifications = notifications;
    setError('');
    setIsMarkingAllRead(true);
    setNotifications(previousNotifications.map(notification => ({ ...notification, isRead: true })));

    try {
      await notificationService.markAllRead(userId);
      recordNotificationsWorkflowAnalytics({
        userId,
        action: 'notifications_mark_all_read_confirmed',
        unreadCount,
      });
    } catch (markAllError) {
      console.warn('[NotificationsCenter] Unable to mark all notifications as read:', markAllError);
      setNotifications(previousNotifications);
      setError('Notifications could not be marked read. Retry available.');
      recordNotificationsWorkflowAnalytics({
        userId,
        action: 'notifications_mark_all_read_failed',
        unreadCount,
        errorCategory: markAllError instanceof Error ? markAllError.name : 'unknown',
      });
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleRetry = () => {
    if (userId) {
      recordNotificationsWorkflowAnalytics({ userId, action: 'notifications_retry_clicked' });
    }
    void loadNotifications();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Your complete account history of application updates, job alerts, messages, reminders, and achievements."
        actions={unreadCount > 0 ? (
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={isMarkingAllRead}
          >
            <Check {...decorativeIconProps} className="h-4 w-4" />
            {isMarkingAllRead ? 'Marking all read...' : `Mark all read (${unreadCount})`}
          </Button>
        ) : undefined}
        badge={sourceLabel ? (
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
            metadata?.degraded
              ? 'border-warning/30 text-warning'
              : 'border-[var(--border-default)] text-[var(--text-muted)]'
          }`}>
            {sourceLabel}
          </span>
        ) : undefined}
      />

      {!error && metadata?.degraded && (
        <div role="status" className="rounded-lg border border-warning/20 bg-[var(--bg-panel)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <p>{metadata.message}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-2 rounded-md px-2 py-1 text-xs font-medium text-warning hover:bg-warning-muted/30 focus:outline-none focus:ring-2 focus:ring-warning/20"
          >
            Retry notifications
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          idPrefix="notifications-filter"
          ariaLabel="Filter notifications"
          activeTab={filter}
          onTabChange={(tabId) => setFilter(tabId as NotificationFilter)}
          tabs={[
            { id: 'all', label: `All${notifications.length > 0 ? ` (${notifications.length})` : ''}` },
            { id: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          ]}
        />
        <p className="text-xs text-[var(--text-muted)]" role="status" aria-live="polite">
          {isLoading
            ? 'Checking for updates...'
            : `${visibleNotifications.length} ${filter === 'unread' ? 'unread' : ''} notification${visibleNotifications.length === 1 ? '' : 's'} shown`}
        </p>
      </div>

      <section aria-label="Notification history">
        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-destructive/20 bg-[var(--bg-panel)] px-4 py-3 text-sm text-destructive">
            <p>{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-2 rounded-md px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive/20"
            >
              Retry notifications
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="surface-card divide-y divide-[var(--border-subtle)] p-2" aria-hidden="true">
            {[0, 1, 2, 3].map(row => (
              <div key={row} className="flex items-start gap-3 px-3 py-4">
                <Skeleton className="h-9 w-9 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : visibleNotifications.length > 0 ? (
          <>
            <ul className="surface-card divide-y divide-[var(--border-subtle)] p-2" aria-label={filter === 'unread' ? 'Unread notifications' : 'Notification history'}>
              {visibleNotifications.map(notification => {
                const { label, Icon } = getNotificationTypeMeta(notification.type);
                const scheduleState = getNotificationScheduleState(notification, now);
                const dueAt = getNotificationReminderDueAt(notification);
                const isScheduled = scheduleState === 'scheduled';

                return (
                  <li key={notification.id}>
                    <div
                      className={`group flex w-full items-start gap-3 rounded-lg px-3 py-3 transition-colors sm:px-4 ${
                        notification.isRead ? '' : 'bg-accent/[0.04]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                          notification.isRead
                            ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                            : 'bg-accent/10 text-accent'
                        }`}
                        aria-hidden="true"
                      >
                        <Icon size={16} />
                      </span>

                      <button
                        type="button"
                        onClick={() => void handleOpenNotification(notification)}
                        className="min-w-0 flex-1 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label={`${notification.title}. ${notification.isRead ? 'Read' : 'Unread'}. Opens related workspace.`}
                      >
                        <span className="flex items-center gap-2">
                          {!notification.isRead && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                          )}
                          <span className={`block truncate text-sm ${notification.isRead ? 'font-medium text-[var(--text-secondary)]' : 'font-semibold text-[var(--text-primary)]'}`}>
                            {notification.title}
                          </span>
                          {isScheduled && (
                            <span className="shrink-0 rounded-full border border-[var(--border-default)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                              Scheduled
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-sm leading-6 text-[var(--text-secondary)]">{notification.message}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
                          <span>{label}</span>
                          <span aria-hidden="true">&middot;</span>
                          <span title={formatAbsoluteTime(notification.createdAt)}>
                            {dueAt
                              ? `${isScheduled ? 'Due' : 'Due now'} ${formatRelativeTime(dueAt.toISOString(), now)}`
                              : formatRelativeTime(notification.createdAt, now)}
                          </span>
                        </span>
                      </button>

                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={() => void handleMarkSingleRead(notification)}
                          className="shrink-0 rounded-md border border-transparent p-1.5 text-[var(--text-muted)] opacity-100 transition-colors hover:bg-[var(--bg-secondary)] hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          aria-label={`Mark "${notification.title}" as read`}
                        >
                          <Check size={15} {...decorativeIconProps} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {hasMore && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => void handleLoadMore()}
                  disabled={isLoadingMore}
                >
                  <RefreshCw {...decorativeIconProps} className={`h-4 w-4 ${isLoadingMore ? 'animate-spin' : ''}`} />
                  {isLoadingMore ? 'Loading older notifications...' : 'Load older notifications'}
                </Button>
              </div>
            )}
          </>
        ) : filter === 'unread' ? (
          <EmptyState
            icon={<Bell className="h-12 w-12" />}
            title="You're all caught up"
            description="No unread notifications right now. New alerts will appear here as your applications, courses, and network update."
            action={{ label: 'View all notifications', onClick: () => setFilter('all') }}
          />
        ) : (
          <EmptyState
            icon={<Bell className="h-12 w-12" />}
            title="No notifications yet"
            description="Application decisions, saved search alerts, course updates, and network activity will show up here."
          />
        )}
      </section>
    </div>
  );
};

export default NotificationsPage;
