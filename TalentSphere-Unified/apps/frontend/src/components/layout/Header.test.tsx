import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Header } from './Header';
import { notificationService } from '../../services/notificationService';
import type { NotificationRecord, PaginatedNotificationsResult } from '../../services/notificationService';

vi.mock('./CommandSearch', () => ({
  CommandSearch: () => <div role="search" aria-label="Command search" />,
}));

vi.mock('../../services/notificationService', async () => {
  const actual = await vi.importActual<typeof import('../../services/notificationService')>(
    '../../services/notificationService',
  );

  return {
    ...actual,
    notificationService: {
      ...actual.notificationService,
      getNotificationsPage: vi.fn(),
      markNotificationRead: vi.fn(),
      markAllRead: vi.fn(),
    },
  };
});

const userFixture = {
  id: 'test-user',
  email: 'test-user@example.com',
  roles: ['ROLE_USER'],
};

const unreadNotificationFixture: NotificationRecord = {
  id: '00000000-0000-4000-8000-000000000001',
  userId: 'test-user',
  type: 'MESSAGE',
  title: 'New recruiter message',
  message: 'Review the latest recruiter reply.',
  isRead: false,
  actionUrl: '/messaging',
  createdAt: '2026-06-28T06:00:00.000Z',
  metadata: {},
};

const notificationPageFixture: PaginatedNotificationsResult = {
  notifications: [unreadNotificationFixture],
  total: 1,
  limit: 8,
  offset: 0,
  hasNext: false,
  nextCursor: null,
  metadata: {
    source: 'account',
    degraded: false,
    message: 'Account notifications are synced.',
  },
};

const emptyNotificationPage: PaginatedNotificationsResult = {
  notifications: [],
  total: 0,
  limit: 8,
  offset: 0,
  hasNext: false,
  nextCursor: null,
  metadata: {
    source: 'account',
    degraded: false,
    message: 'Account notifications are synced.',
  },
};

const renderHeader = ({
  isSidebarOpen = false,
  setIsSidebarOpen,
}: {
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
} = {}) => {
  const result = render(
    <MemoryRouter>
      <Header
        user={userFixture}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
    </MemoryRouter>,
  );

  return result;
};

describe('Header notifications', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps shell controls named while hiding visual-only header icons', async () => {
    const setIsSidebarOpen = vi.fn();
    vi.mocked(notificationService.getNotificationsPage).mockResolvedValue(emptyNotificationPage);

    const { container } = renderHeader({ isSidebarOpen: false, setIsSidebarOpen });

    await waitFor(() => {
      expect(notificationService.getNotificationsPage).toHaveBeenCalledTimes(1);
    });

    const menuButton = screen.getByRole('button', { name: 'Toggle navigation menu' });
    const notificationsButton = screen.getByRole('button', { name: 'View notifications' });

    expect(menuButton.getAttribute('type')).toBe('button');
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(menuButton.getAttribute('aria-controls')).toBe('app-shell-mobile-sidebar');
    expect(notificationsButton.getAttribute('type')).toBe('button');
    expect(notificationsButton.getAttribute('aria-controls')).toBe('app-shell-notifications');
    expect(container.querySelector('.rounded-full[aria-hidden="true"]')?.textContent).toBe('T');

    container.querySelectorAll('svg').forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.getAttribute('focusable')).toBe('false');
    });

    fireEvent.click(menuButton);
    expect(setIsSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('shows safe notification load failure copy and retries through the existing retry action', async () => {
    vi.mocked(notificationService.getNotificationsPage)
      .mockRejectedValueOnce(new Error('Notification provider failed with service_role_token=secret'))
      .mockResolvedValueOnce(notificationPageFixture);

    renderHeader();

    await waitFor(() => {
      expect(notificationService.getNotificationsPage).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'View notifications' }));

    expect(screen.getByText('Notifications could not load.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry notifications' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Notification provider failed/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Retry notifications' }));

    await waitFor(() => {
      expect(notificationService.getNotificationsPage).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText('Account sync')).toBeTruthy();
    expect(screen.getByRole('button', { name: /New recruiter message/ })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Notification provider failed/i)).toBeNull();
  });

  it('keeps unread notifications visible after mark-all failure and retries through Mark read', async () => {
    vi.mocked(notificationService.getNotificationsPage).mockResolvedValue(notificationPageFixture);
    vi.mocked(notificationService.markAllRead)
      .mockRejectedValueOnce(new Error('Notification read update failed with service_role_token=secret'))
      .mockResolvedValueOnce(undefined);

    renderHeader();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'View notifications, 1 unread' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'View notifications, 1 unread' }));
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }));

    await waitFor(() => {
      expect(notificationService.markAllRead).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Notifications could not be marked read. Retry available.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View notifications, 1 unread' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Notification read update failed/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }));

    await waitFor(() => {
      expect(notificationService.markAllRead).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.queryByText('Notifications could not be marked read. Retry available.')).toBeNull();
    });
    expect(screen.queryByRole('button', { name: 'Mark read' })).toBeNull();
    expect(screen.getByRole('button', { name: 'View notifications' })).toBeTruthy();
  });
});
