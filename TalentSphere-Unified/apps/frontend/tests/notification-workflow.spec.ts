import { expect, test, type Page } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';
import { defaultRouteAuditRestFixtures } from './helpers/routeAudit';

type JsonRecord = Record<string, unknown>;

const userId = 'e2e-role_user';

const buildNotificationRow = (
  id: string,
  options: {
    actionUrl?: string;
    createdAt: string;
    isRead?: boolean;
    message?: string;
    metadata?: JsonRecord;
    title: string;
    type?: string;
  },
): JsonRecord => ({
  id,
  user_id: userId,
  type: options.type || 'SYSTEM',
  title: options.title,
  message: options.message || `${options.title} message`,
  is_read: options.isRead ?? false,
  action_url: options.actionUrl || '/jobs',
  metadata: options.metadata || {},
  created_at: options.createdAt,
});

const dueMessage = buildNotificationRow('00000000-0000-4000-8000-000000000001', {
  actionUrl: '/messaging',
  createdAt: '2026-06-27T10:00:00.000Z',
  title: 'New recruiter message',
  type: 'MESSAGE',
});

const futureReminder = buildNotificationRow('00000000-0000-4000-8000-000000000002', {
  actionUrl: '/networking',
  createdAt: '2026-06-27T09:55:00.000Z',
  metadata: {
    kind: 'networking_follow_up_reminder',
    connectionId: 'connection-e2e-001',
    recipientId: 'network-target-e2e',
    recipientName: 'Lena Ortiz',
    remindAt: '2026-07-01T09:00:00.000Z',
  },
  title: 'Connection follow-up reminder',
  type: 'CONNECTION',
});

const installNotificationStubs = async (
  page: Page,
  options: {
    notifications?: JsonRecord[];
    onNotificationRows?: (context: { cursor?: string; limit: number | null; offset: number; userId?: string }) => JsonRecord[];
    onNotificationUpdate?: (payload: JsonRecord, context: { id?: string; isRead?: string; userId?: string }) => JsonRecord;
  } = {},
) => {
  await installNetworkStubs(page, {
    rest: {
      ...defaultRouteAuditRestFixtures,
      notifications: options.notifications || [dueMessage],
      onNotificationRows: options.onNotificationRows,
      onNotificationUpdate: options.onNotificationUpdate,
    },
  });
  await installE2EAuth(page, [USER_ROLES.user]);
};

const openNotifications = async (page: Page) => {
  const notificationsButton = page.getByRole('button', { name: /^View notifications/ });
  await notificationsButton.click();
  const notificationsRegion = page.getByRole('region', { name: 'Notifications' });
  await expect(notificationsRegion).toBeVisible();
  return { notificationsButton, notificationsRegion };
};

test.describe('notification workflow', () => {
  test('labels account sync state and marks unread account notifications read explicitly', async ({ page }) => {
    const updatePayloads: Array<{ context: JsonRecord; payload: JsonRecord }> = [];
    let notificationRows = [dueMessage, futureReminder];
    await installNotificationStubs(page, {
      notifications: notificationRows,
      onNotificationRows: () => notificationRows,
      onNotificationUpdate: (payload, context) => {
        updatePayloads.push({ context, payload });
        notificationRows = notificationRows.map((notification) => {
          const matchesId = !context.id || notification.id === context.id;
          const matchesRead = context.isRead === undefined || String(notification.is_read) === context.isRead;
          const matchesUser = !context.userId || notification.user_id === context.userId;

          return matchesId && matchesRead && matchesUser
            ? { ...notification, ...payload }
            : notification;
        });

        return {
          updated: true,
          ...payload,
        };
      },
    });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();

    await expect(page.getByRole('button', { name: /^View notifications, 1 unread$/ })).toBeVisible();
    const { notificationsButton, notificationsRegion } = await openNotifications(page);

    await expect(notificationsRegion.getByText('Account sync')).toBeVisible();
    await expect(notificationsRegion.getByText('2 of 2 loaded')).toBeVisible();
    await expect(notificationsRegion.getByRole('button', { name: /New recruiter message/ })).toBeVisible();
    await expect(notificationsRegion.getByRole('button', { name: /Connection follow-up reminder/ })).toContainText('Scheduled');

    await notificationsRegion.getByRole('button', { name: 'Mark read' }).click();

    await expect(notificationsButton).toHaveAccessibleName('View notifications');
    await expect(notificationsRegion.getByRole('button', { name: 'Mark read' })).toHaveCount(0);
    await expect.poll(() => updatePayloads).toHaveLength(1);
    expect(updatePayloads[0].context).toMatchObject({
      isRead: 'false',
      userId,
    });
    expect(updatePayloads[0].payload).toMatchObject({
      is_read: true,
    });
  });

  test('shows degraded notification source and recovers through retry without losing reminders', async ({ page }) => {
    let accountStoreAvailable = false;

    await installNotificationStubs(page, {
      notifications: [dueMessage],
      onNotificationRows: () => {
        if (!accountStoreAvailable) {
          throw new Error('Account notification store unavailable');
        }
        return [dueMessage];
      },
    });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();

    const { notificationsRegion } = await openNotifications(page);
    await expect(notificationsRegion.getByText('Notification API fallback', { exact: true })).toBeVisible();
    await expect(notificationsRegion.getByText('Account notification storage is unavailable. Showing notification API fallback data.')).toBeVisible();
    await expect(notificationsRegion.getByRole('button', { name: /Review your application activity/ })).toBeVisible();

    accountStoreAvailable = true;
    await notificationsRegion.getByRole('button', { name: 'Retry notifications' }).click();

    await expect(notificationsRegion.getByText('Account sync')).toBeVisible();
    await expect(notificationsRegion.getByRole('button', { name: /New recruiter message/ })).toBeVisible();
    await expect(notificationsRegion.getByText('Notification API fallback', { exact: true })).toHaveCount(0);
  });

  test('keeps unread state visible when mark-all persistence fails', async ({ page }) => {
    await installNotificationStubs(page, {
      notifications: [dueMessage],
      onNotificationUpdate: () => {
        throw new Error('Mark read persistence failed');
      },
    });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();

    const { notificationsButton, notificationsRegion } = await openNotifications(page);
    await expect(notificationsButton).toHaveAccessibleName('View notifications, 1 unread');

    await notificationsRegion.getByRole('button', { name: 'Mark read' }).click();

    await expect(notificationsRegion.getByText('Notifications could not be marked read. Retry available.')).toBeVisible();
    await expect(notificationsRegion.getByRole('button', { name: 'Retry notifications' })).toBeVisible();
    await expect(notificationsRegion.getByRole('button', { name: 'Mark read' })).toBeVisible();
    await expect(notificationsButton).toHaveAccessibleName('View notifications, 1 unread');
  });
});
