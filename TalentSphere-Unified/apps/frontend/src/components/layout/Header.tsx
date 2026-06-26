import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, ArrowRight, Briefcase, UserRound, MessageSquare, GraduationCap, Trophy, Settings, ShieldCheck } from 'lucide-react';
import {
  getNotificationReminderDueAt,
  getNotificationScheduleState,
  isNotificationUrgentUnread,
  notificationService,
  NOTIFICATIONS_CHANGED_EVENT,
} from '../../services/notificationService';
import type { NotificationRecord } from '../../services/notificationService';

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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [accountNotifications, setAccountNotifications] = useState<NotificationRecord[]>([]);
  const [notificationTotal, setNotificationTotal] = useState<number | null>(null);
  const [notificationNextCursor, setNotificationNextCursor] = useState<string | null>(null);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [notificationNow, setNotificationNow] = useState(() => new Date());
  const roles = user?.roles || [];

  const searchDestinations = useMemo(() => {
    const baseDestinations = [
      { label: 'Jobs', description: 'Find roles, saved searches, and applications', path: '/jobs', icon: Briefcase, keywords: 'jobs roles applications search saved apply' },
      { label: 'Profile', description: 'Update profile, skills, experience, and education', path: '/profile', icon: UserRound, keywords: 'profile skills experience education resume' },
      { label: 'Messages', description: 'Open recruiter and network conversations', path: '/messaging', icon: MessageSquare, keywords: 'messages chat conversation recruiter network' },
      { label: 'Network', description: 'Manage connections and requests', path: '/networking', icon: UserRound, keywords: 'network connections requests people' },
      { label: 'AI Assistant', description: 'Draft career questions and review AI guidance', path: '/ai', icon: ShieldCheck, keywords: 'ai assistant career draft guidance' },
      { label: 'Settings', description: 'Manage notifications, security, and billing snapshot', path: '/settings', icon: Settings, keywords: 'settings notifications security billing password' },
      { label: 'Learning', description: 'Continue courses and lessons', path: '/lms', icon: GraduationCap, keywords: 'learning courses lms lessons progress', roles: ['ROLE_USER'] },
      { label: 'Challenges', description: 'Solve coding challenges', path: '/challenges', icon: Trophy, keywords: 'challenges arena coding submissions', roles: ['ROLE_USER'] },
      { label: 'Candidates', description: 'Review applicants and notes', path: '/candidates', icon: UserRound, keywords: 'candidates applicants notes review offer reject', roles: ['ROLE_RECRUITER'] },
      { label: 'Admin Console', description: 'Inspect platform health and services', path: '/admin', icon: ShieldCheck, keywords: 'admin console health services telemetry', roles: ['ROLE_ADMIN'] },
    ];

    return baseDestinations.filter(destination => (
      !destination.roles || roles.some((role: string) => destination.roles?.includes(role))
    ));
  }, [roles]);

  const searchResults = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return searchDestinations.slice(0, 5);

    return searchDestinations
      .filter(destination => (
        destination.label.toLowerCase().includes(normalizedSearch) ||
        destination.description.toLowerCase().includes(normalizedSearch) ||
        destination.keywords.includes(normalizedSearch)
      ))
      .slice(0, 6);
  }, [searchDestinations, searchTerm]);

  const reminders = useMemo(() => {
    const items = [
      {
        title: 'Review your application activity',
        description: 'Open Jobs to inspect submitted applications and saved searches.',
        path: '/jobs',
        roles: ['ROLE_USER', 'ROLE_RECRUITER']
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
        roles: ['ROLE_RECRUITER']
      }
    ];

    return items.filter(item => (
      !item.roles || roles.some((role: string) => item.roles?.includes(role))
    ));
  }, [roles]);
  const unreadAccountNotifications = accountNotifications.filter(notification => isNotificationUrgentUnread(notification, notificationNow));
  const notificationCountLabel = notificationTotal !== null
    ? `${accountNotifications.length} of ${notificationTotal} loaded`
    : `${accountNotifications.length} loaded`;

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
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }

      if (event.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const navigateTo = (path: string) => {
    navigate(path);
    setSearchTerm('');
    setIsSearchOpen(false);
    setIsNotificationsOpen(false);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const firstResult = searchResults[0];
    if (firstResult) {
      navigateTo(firstResult.path);
    }
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

    setAccountNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
    try {
      await notificationService.markAllRead(user.id);
    } catch (error) {
      console.warn('Unable to mark notifications as read:', error);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[var(--border-default)] bg-[var(--bg-primary)]/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
      {/* Left: Mobile menu toggle */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsSidebarOpen?.(!isSidebarOpen)}
          className="lg:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md mx-4">
        <form className="relative" onSubmit={handleSearchSubmit}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <input 
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            aria-label="Search platform"
            aria-expanded={isSearchOpen}
            aria-controls="app-shell-search-results"
            className="w-full h-8 pl-9 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            value={searchTerm}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setIsSearchOpen(true);
            }}
          />
          <kbd className="hidden sm:inline-flex absolute right-2 top-1/2 -translate-y-1/2 h-5 items-center gap-1 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-1.5 text-[10px] font-medium text-[var(--text-muted)]">
            ⌘K
          </kbd>

          {isSearchOpen && (
            <div
              id="app-shell-search-results"
              className="absolute left-0 right-0 top-10 z-50 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-2xl"
            >
              {searchResults.length > 0 ? (
                <div className="max-h-80 overflow-y-auto p-1.5">
                  {searchResults.map(result => {
                    const Icon = result.icon;
                    return (
                      <button
                        key={result.path}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => navigateTo(result.path)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-accent/20"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                          <Icon size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-[var(--text-primary)]">{result.label}</span>
                          <span className="block truncate text-xs text-[var(--text-muted)]">{result.description}</span>
                        </span>
                        <ArrowRight size={14} className="text-[var(--text-muted)]" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-4 text-sm text-[var(--text-muted)]">No matching destinations</div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(open => !open)}
            className="relative p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            aria-label="View notifications"
            aria-expanded={isNotificationsOpen}
            aria-controls="app-shell-notifications"
          >
            <Bell size={18} />
            {unreadAccountNotifications.length > 0 && (
              <span className="absolute top-0.5 right-0.5 min-h-2 min-w-2 rounded-full bg-accent" />
            )}
          </button>

          {isNotificationsOpen && (
            <div
              id="app-shell-notifications"
              className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-2xl"
            >
              <div className="border-b border-[var(--border-default)] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
                    <p className="text-xs text-[var(--text-muted)]">Actionable reminders stay under your control.</p>
                    {accountNotifications.length > 0 && (
                      <p role="status" aria-live="polite" className="mt-1 text-[10px] text-[var(--text-muted)]">
                        {notificationCountLabel}
                      </p>
                    )}
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
                      <div role="alert" className="mb-1 rounded-lg px-3 py-2 text-xs text-destructive">
                        {notificationError}
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
                              className="w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-accent/20"
                            >
                              <span className="flex items-center gap-2">
                                {isUrgentUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                                <span className="block min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">{item.title}</span>
                                {isScheduled && (
                                  <span className="shrink-0 rounded-full border border-[var(--border-default)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                                    Scheduled
                                  </span>
                                )}
                              </span>
                              <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{item.message}</span>
                              <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
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
                            className="mt-1 w-full rounded-lg border border-[var(--border-default)] px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                            className="w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-accent/20"
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
        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-semibold">
          {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>

      </div>
    </header>
  );
};
