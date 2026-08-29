import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsPage } from './NotificationsPage';

const mockNavigate = vi.fn();
const getNotificationsPageMock = vi.hoisted(() => vi.fn());
const markNotificationReadMock = vi.hoisted(() => vi.fn());
const markAllReadMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../services/notificationService', async () => {
  const actual = await vi.importActual<typeof import('../../services/notificationService')>(
    '../../services/notificationService',
  );

  return {
    ...actual,
    notificationService: {
      ...(actual as { notificationService: Record<string, unknown> }).notificationService,
      getNotificationsPage: getNotificationsPageMock,
      markNotificationRead: markNotificationReadMock,
      markAllRead: markAllReadMock,
    },
  };
});

vi.mock('../../store/hooks', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) => selector({
    auth: { user: { id: 'user-001', roles: ['ROLE_USER'] } },
  }),
}));

vi.mock('../../lib/notificationsWorkflowAnalytics', () => ({
  recordNotificationsWorkflowAnalytics: vi.fn(),
}));

const buildNotification = (overrides: Record<string, unknown> = {}) => ({
  id: 'notification-001',
  userId: 'user-001',
  type: 'JOB_APPLICATION',
  title: 'Application update',
  message: 'Your application moved to interview.',
  isRead: false,
  actionUrl: '/jobs',
  metadata: {},
  createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  ...overrides,
});

const buildEmptyPage = () => ({
  notifications: [],
  total: 0,
  limit: 15,
  offset: 0,
  hasNext: false,
  nextCursor: null,
  metadata: { source: 'account', degraded: false, message: 'Account notifications are synced.' },
});

const renderPage = () => render(
  <MemoryRouter>
    <NotificationsPage />
  </MemoryRouter>,
);

describe('NotificationsPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    markNotificationReadMock.mockReset();
    markNotificationReadMock.mockResolvedValue(undefined);
    markAllReadMock.mockReset();
    markAllReadMock.mockResolvedValue(undefined);
    getNotificationsPageMock.mockReset();
    getNotificationsPageMock.mockResolvedValue(buildEmptyPage());
  });

  it('loads and renders the notification history with unread affordances', async () => {
    getNotificationsPageMock.mockResolvedValue({
      notifications: [
        buildNotification(),
        buildNotification({
          id: 'notification-002',
          type: 'ACHIEVEMENT',
          title: 'Badge unlocked',
          message: 'You earned the First Submission badge.',
          isRead: true,
          createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
        }),
      ],
      total: 2,
      limit: 15,
      offset: 0,
      hasNext: true,
      nextCursor: 'cursor-1',
      metadata: { source: 'account', degraded: false, message: 'Account notifications are synced.' },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Application update')).toBeTruthy();
    });
    expect(screen.getByText('Badge unlocked')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Mark all read \(1\)/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Unread (1)' })).toBeTruthy();
    expect(getNotificationsPageMock).toHaveBeenCalledWith('user-001', {
      limit: 15,
      offset: 0,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Load older notifications' }));

    await waitFor(() => {
      expect(getNotificationsPageMock).toHaveBeenCalledTimes(2);
    });
    expect(getNotificationsPageMock).toHaveBeenLastCalledWith('user-001', {
      limit: 15,
      cursor: 'cursor-1',
    });
  });

  it('opens a notification, marks it read, and navigates to its action URL', async () => {
    getNotificationsPageMock.mockResolvedValue({
      notifications: [buildNotification()],
      total: 1,
      limit: 15,
      offset: 0,
      hasNext: false,
      nextCursor: null,
      metadata: { source: 'account', degraded: false, message: 'Account notifications are synced.' },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Application update')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', {
      name: 'Application update. Unread. Opens related workspace.',
    }));

    await waitFor(() => {
      expect(markNotificationReadMock).toHaveBeenCalledWith('user-001', 'notification-001');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/jobs');
  });

  it('marks a single notification as read without navigating away', async () => {
    getNotificationsPageMock.mockResolvedValue({
      notifications: [buildNotification()],
      total: 1,
      limit: 15,
      offset: 0,
      hasNext: false,
      nextCursor: null,
      metadata: { source: 'account', degraded: false, message: 'Account notifications are synced.' },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark "Application update" as read' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mark "Application update" as read' }));

    await waitFor(() => {
      expect(markNotificationReadMock).toHaveBeenCalledWith('user-001', 'notification-001');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('marks all unread notifications as read from the page header action', async () => {
    getNotificationsPageMock.mockResolvedValue({
      notifications: [
        buildNotification(),
        buildNotification({ id: 'notification-002', title: 'Second update' }),
      ],
      total: 2,
      limit: 15,
      offset: 0,
      hasNext: false,
      nextCursor: null,
      metadata: { source: 'account', degraded: false, message: 'Account notifications are synced.' },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mark all read \(2\)/ })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Mark all read \(2\)/ }));

    await waitFor(() => {
      expect(markAllReadMock).toHaveBeenCalledWith('user-001');
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Mark all read/ })).toBeNull();
    });
  });

  it('shows the caught-up empty state on the Unread tab and supports retry after failure', async () => {
    getNotificationsPageMock
      .mockResolvedValueOnce({
        notifications: [buildNotification({ isRead: true })],
        total: 1,
        limit: 15,
        offset: 0,
        hasNext: false,
        nextCursor: null,
        metadata: { source: 'local-fallback', degraded: true, message: 'Showing locally saved notifications.' },
      })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        notifications: [buildNotification({ isRead: true })],
        total: 1,
        limit: 15,
        offset: 0,
        hasNext: false,
        nextCursor: null,
        metadata: { source: 'account', degraded: false, message: 'Account notifications are synced.' },
      });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Showing locally saved notifications.')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('tab', { name: /^Unread$/ }));
    expect(await screen.findByText("You're all caught up")).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Retry notifications' })[0]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
    expect(getNotificationsPageMock).toHaveBeenCalledTimes(2);

    expect(screen.getAllByRole('button', { name: 'Retry notifications' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Retry notifications' }));

    await waitFor(() => {
      expect(getNotificationsPageMock).toHaveBeenCalledTimes(3);
    });
    expect(await screen.findByText('Account sync')).toBeTruthy();
  });
});
