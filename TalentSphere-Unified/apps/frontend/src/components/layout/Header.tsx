import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import {
  getNotificationReminderDueAt,
  getNotificationScheduleState,
  isNotificationUrgentUnread,
  notificationService,
  NOTIFICATIONS_CHANGED_EVENT,
} from '../../services/notificationService';
import type { NotificationRecord, PaginatedNotificationsResult } from '../../services/notificationService';
import { USER_ROLES } from '../../navigation/routeRegistry';
import { CommandSearch } from './CommandSearch';

const notificationPageSize = 8;

interface HeaderProps {
  scrolled?: boolean;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
  user?: any;
  navItems?: any[];
  isActive?: (path: string) => boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  user
}) => {
  const navigate = useNavigate();
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const notificationsPanelRef = useRef<HTMLDivElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [accountNotifications, setAccountNotifications] = useState<NotificationRecord[]>([]);
  const [notificationTotal, setNotificationTotal] = useState<number | null>(null);
  const [notificationNextCursor, setNotificationNextCursor] = useState<string | null>(null);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [notificationMetadata, setNotificationMetadata] = useState<PaginatedNotificationsResult['metadata'] | null>(null);
  const [notificationNow, setNotificationNow] = useState(() => new Date());
  const roles = user?.roles || [];

  const reminders = useMemo(() => {
    const items = [
      {
        title: 'Review your application activity',
        description: 'Open Jobs to inspect submitted applications and saved searches.',
        path: '/jobs',
        roles: [USER_ROLES.user, USER_ROLES.recruiter]
      },
      {
        title: 'Keep your profile current',
        description: 'Update profile details so matching and review flows stay accurate.',
        path: '/profile'
      },
      {
        title: 'Check new conversations',
        description: 'Open Messages to continue recruiter or network conversations.',
        path: '/messaging'
      },
      {
        title: 'Review candidate notes',
        description: 'Inspect applicants, notes, and offer/reject actions.',
        path: '/candidates',
        roles: [USER_ROLES.recruiter]
      }
    ];

    return items.filter(item => (
      !item.roles || roles.some((role: string) => item.roles?.includes(role as typeof item.roles[number]))
    ));
  }, [roles]);
  const unreadAccountNotifications = accountNotifications.filter(notification => isNotificationUrgentUnread(notification, notificationNow));
  const notificationCountLabel = notificationTotal !== null
    ? `${accountNotifications.length} of ${notificationTotal} loaded`
    : `${accountNotifications.length} loaded`;
  const notificationSourceLabel = notificationMetadata?.source === 'account'
    ? 'Account sync'
    : notificationMetadata?.source === 'notification-api'
      ? 'Notification API fallback'
      : notificationMetadata?.source === 'local-fallback'
        ? 'Local browser fallback'
        : null;

  const formatNotificationTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';

    return parsed.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const loadAccountNotifications = React.useCallback(async () => {
    if (!user?.id) {
      setAccountNotifications([]);
      setNotificationTotal(null);
      setNotificationNextCursor(null);
      setHasMoreNotifications(false);
      setIsLoadingNotifications(false);
      setNotificationError('');
      setNotificationMetadata(null);
      return;
    }

    setIsLoadingNotifications(true);
    setNotificationError('');
    try {
      const page = await notificationService.getNotificationsPage(user.id, {
        limit: notificationPageSize,
        offset: 0
      });
      setAccountNotifications(page.notifications);
      setNotificationTotal(page.total);
      setNotificationNextCursor(page.nextCursor);
      setHasMoreNotifications(page.hasNext && Boolean(page.nextCursor));
      setNotificationMetadata(page.metadata);
    } catch (error) {
      console.warn('Unable to load account notifications:', error);
      setNotificationError('Notifications could not load.');
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user?.id]);

  const handleLoadMoreNotifications = async () => {
    if (!user?.id || isLoadingMoreNotifications || !notificationNextCursor) return;

    setIsLoadingMoreNotifications(true);
    setNotificationError('');
    try {
      const page = await notificationService.getNotificationsPage(user.id, {
        limit: notificationPageSize,
        cursor: notificationNextCursor
      });
      setAccountNotifications(prev => {
        const byId = new Map<string, NotificationRecord>();
        [...prev, ...page.notifications].forEach(notification => byId.set(notification.id, notification));
        return Array.from(byId.values()).sort((a, b) => {
          const timeDelta = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          if (timeDelta !== 0) return timeDelta;
          return b.id.localeCompare(a.id);
        });
      });
      if (page.total !== null) {
        setNotificationTotal(page.total);
      }
      setNotificationNextCursor(page.nextCursor);
      setHasMoreNotifications(page.hasNext && Boolean(page.nextCursor));
      setNotificationMetadata(page.metadata);
    } catch (error) {
      console.warn('Unable to load more account notifications:', error);
      setNotificationError('More notifications could not load. Retry available.');
    } finally {
      setIsLoadingMoreNotifications(false);
    }
  };

  useEffect(() => {
    void loadAccountNotifications();
  }, [loadAccountNotifications]);

  useEffect(() => {
    const timer = window.setInterval(() => setNotificationNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleNotificationChange = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!user?.id || detail?.userId === user.id) {
        void loadAccountNotifications();
      }
    };

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationChange);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleNotificationChange);
  }, [loadAccountNotifications, user?.id]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const activeElement = document.activeElement;
        const shouldRestoreNotificationFocus = activeElement instanceof HTMLElement && (
          notificationButtonRef.current === activeElement ||
          Boolean(notificationsPanelRef.current?.contains(activeElement))
        );

        setIsNotificationsOpen(false);

        if (shouldRestoreNotificationFocus) {
          window.requestAnimationFrame(() => notificationButtonRef.current?.focus());
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const navigateTo = (path: string) => {
    navigate(path);
    setIsNotificationsOpen(false);
  };

  const handleNotificationClick = async (notification: NotificationRecord) => {
    if (user?.id && !notification.isRead) {
      setAccountNotifications(prev => prev.map(item => (
        item.id === notification.id ? { ...item, isRead: true } : item
      )));

      try {
        await notificationService.markNotificationRead(user.id, notification.id);
      } catch (error) {
        console.warn('Unable to mark notification as read:', error);
      }
    }

    navigateTo(notification.actionUrl || '/jobs');
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!user?.id) return;

    const previousNotifications = accountNotifications;
    setNotificationError('');
    setAccountNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
    try {
      await notificationService.markAllRead(user.id);
    } catch (error) {
      console.warn('Unable to mark notifications as read:', error);
      setAccountNotifications(previousNotifications);
      setNotificationError('Notifications could not be marked read. Retry available.');
    }
  };

  const handleRetryNotifications = () => {
    void loadAccountNotifications();
  };

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] min-w-0 items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--bg-panel)]/90 px-4 backdrop-blur-sm lg:px-6">
      {/* Left: Mobile menu toggle */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setIsSidebarOpen?.(!isSidebarOpen)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-panel)] lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={Boolean(isSidebarOpen)}
          aria-controls="app-shell-mobile-sidebar"
        >
          <Menu size={20} aria-hidden="true" focusable="false" />
        </button>
      </div>

      {/* Center: Search */}
      <div className="mx-2 min-w-0 flex-1 sm:mx-4 sm:max-w-md">
        <CommandSearch roles={roles} onNavigate={() => setIsNotificationsOpen(false)} />
      </div>

      {/* Right: Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative">
          <button
            type="button"
            ref={notificationButtonRef}
            onClick={() => setIsNotificationsOpen(open => !open)}
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-panel)]"
            aria-label={unreadAccountNotifications.length > 0 ? `View notifications, ${unreadAccountNotifications.length} unread` : 'View notifications'}
            aria-expanded={isNotificationsOpen}
            aria-controls="app-shell-notifications"
          >
            <Bell size={18} aria-hidden="true" focusable="false" />
            {unreadAccountNotifications.length > 0 && (
              <span className="absolute top-0.5 right-0.5 min-h-2 min-w-2 rounded-full bg-accent" aria-hidden="true" />
            )}
          </button>

          {isNotificationsOpen && (
            <div
              ref={notificationsPanelRef}
              id="app-shell-notifications"
              role="region"
              aria-label="Notifications"
              className="surface-card absolute right-0 top-11 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden"
            >
              <div className="border-b border-[var(--border-default)] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
                    <p className="text-xs text-[var(--text-muted)]">Actionable reminders stay under your control.</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {notificationSourceLabel && (
                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                          notificationMetadata?.degraded
                            ? 'border-warning/30 text-warning'
                            : 'border-[var(--border-default)] text-[var(--text-muted)]'
                        }`}>
                          {notificationSourceLabel}
                        </span>
                      )}
                      {accountNotifications.length > 0 && (
                        <span role="status" aria-live="polite" className="text-[10px] text-[var(--text-muted)]">
                          {notificationCountLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  {unreadAccountNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllNotificationsRead}
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto p-1.5">
                {isLoadingNotifications ? (
                  <div className="px-3 py-4 text-sm text-[var(--text-muted)]">Loading notifications...</div>
                ) : (
                  <>
                    {notificationError && (
                      <div role="alert" className="mb-1 rounded-lg border border-destructive/20 px-3 py-2 text-xs text-destructive">
                        <p>{notificationError}</p>
                        <button
                          type="button"
                          onClick={handleRetryNotifications}
                          className="mt-2 rounded-md px-2 py-1 font-medium text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive/20"
                        >
                          Retry notifications
                        </button>
                      </div>
                    )}
                    {!notificationError && notificationMetadata?.degraded && (
                      <div role="status" className="mb-1 rounded-lg border border-warning/20 px-3 py-2 text-xs text-[var(--text-secondary)]">
                        <p>{notificationMetadata.message}</p>
                        <button
                          type="button"
                          onClick={handleRetryNotifications}
                          className="mt-2 rounded-md px-2 py-1 font-medium text-warning hover:bg-warning-muted/30 focus:outline-none focus:ring-2 focus:ring-warning/20"
                        >
                          Retry notifications
                        </button>
                      </div>
                    )}
                    {accountNotifications.length > 0 && (
                      <div className="space-y-1">
                        {accountNotifications.map(item => {
                          const scheduleState = getNotificationScheduleState(item, notificationNow);
                          const dueAt = getNotificationReminderDueAt(item);
                          const isScheduled = scheduleState === 'scheduled';
                          const isUrgentUnread = isNotificationUrgentUnread(item, notificationNow);

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleNotificationClick(item)}
                              className="w-full rounded-md px-3 py-2 text-left hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-accent/20"
                            >
                              <span className="flex items-center gap-2">
                                {isUrgentUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
                                <span className="block min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">{item.title}</span>
                                {isScheduled && (
                                  <span className="shrink-0 rounded-full border border-[var(--border-default)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                                    Scheduled
                                  </span>
                                )}
                              </span>
                              <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{item.message}</span>
                              <span className="mt-1 block text-[10px] font-medium uppercase text-[var(--text-muted)]">
                                {dueAt ? `${isScheduled ? 'Due' : 'Due now'} ${formatNotificationTime(dueAt.toISOString())}` : formatNotificationTime(item.createdAt)}
                              </span>
                            </button>
                          );
                        })}
                        {hasMoreNotifications && (
                          <button
                            type="button"
                            onClick={handleLoadMoreNotifications}
                            disabled={isLoadingMoreNotifications}
                            className="mt-1 w-full rounded-md border border-[var(--border-default)] px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isLoadingMoreNotifications ? 'Loading more...' : 'Load more notifications'}
                          </button>
                        )}
                      </div>
                    )}

                    {reminders.length > 0 && (
                      <div className={accountNotifications.length > 0 ? 'mt-2 border-t border-[var(--border-default)] pt-2' : ''}>
                        {reminders.map(item => (
                          <button
                            key={`${item.title}-${item.path}`}
                            type="button"
                            onClick={() => navigateTo(item.path)}
                            className="w-full rounded-md px-3 py-2 text-left hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-accent/20"
                          >
                            <span className="block text-sm font-medium text-[var(--text-primary)]">{item.title}</span>
                            <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{item.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div aria-hidden="true" className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-semibold">
          {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>

      </div>
    </header>
  );
};
