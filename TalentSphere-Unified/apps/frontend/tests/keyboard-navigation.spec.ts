import { expect, test, type Page } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs, type RestStubFixtures } from './helpers/e2e';
import { defaultRouteAuditRestFixtures } from './helpers/routeAudit';

test.describe('keyboard navigation guardrail', () => {
  const authUserId = 'e2e-role_user';

  const installKeyboardNetworkStubs = async (
    page: Page,
    rest: RestStubFixtures = defaultRouteAuditRestFixtures,
  ) => {
    await page.unroute('**/*').catch(() => undefined);
    await installNetworkStubs(page, { rest });
  };

  const buildNotificationRows = (
    count: number,
    options: {
      actionUrl?: string;
      isRead?: boolean;
      titlePrefix?: string;
      type?: string;
    } = {},
  ) => Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    user_id: authUserId,
    type: options.type || 'SYSTEM',
    title: `${options.titlePrefix || 'Notification'} ${index + 1}`,
    message: `Message ${index + 1}`,
    is_read: options.isRead ?? false,
    action_url: options.actionUrl || '/jobs',
    metadata: {},
    created_at: new Date(Date.UTC(2026, 5, 27, 9, 59 - index, 0)).toISOString(),
  }));

  test.beforeEach(async ({ page }) => {
    await installKeyboardNetworkStubs(page);
  });

  test('command search can be focused and submitted from the keyboard', async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.user]);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();

    const searchInput = page.getByRole('combobox', { name: 'Search platform' });
    await page.keyboard.press('Control+KeyK');
    await expect(searchInput).toBeFocused();

    await searchInput.fill('messages');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/messaging$/);
    await expect(page.getByRole('heading', { name: /^Messages$/ })).toBeVisible();
  });

  test('command search results support arrow-key selection', async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.user]);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();

    const searchInput = page.getByRole('combobox', { name: 'Search platform' });
    await page.keyboard.press('Control+KeyK');
    await expect(searchInput).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const learningOption = page.getByRole('option', { name: /Learning/ });
    await expect(learningOption).toHaveAttribute('aria-selected', 'true');
    await expect(searchInput).toHaveAttribute('aria-activedescendant', /lms$/);

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/lms$/);
    await expect(page.getByRole('heading', { name: /^Learning$/ })).toBeVisible();
  });

  test('mobile bottom navigation links activate from the keyboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installE2EAuth(page, [USER_ROLES.user]);
    await page.goto('/dashboard');

    const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(mobileNavigation).toBeVisible();

    const jobsLink = mobileNavigation.getByRole('link', { name: /^Jobs$/ });
    await jobsLink.focus();
    await expect(jobsLink).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/jobs$/);
    await expect(page.getByRole('heading', { name: /^Jobs$/ })).toBeVisible();
  });

  test('notification reminders are keyboard reachable and activate navigation', async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.user]);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();

    const notificationsButton = page.getByRole('button', { name: /^View notifications/ });
    await notificationsButton.focus();
    await page.keyboard.press('Enter');

    const notificationsRegion = page.getByRole('region', { name: 'Notifications' });
    await expect(notificationsRegion).toBeVisible();

    await page.keyboard.press('Tab');
    const applicationReminder = notificationsRegion.getByRole('button', { name: /Review your application activity/ });
    await expect(applicationReminder).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/jobs$/);
    await expect(page.getByRole('heading', { name: /^Jobs$/ })).toBeVisible();
  });

  test('notification popover restores focus to the trigger on Escape', async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.user]);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();

    const notificationsButton = page.getByRole('button', { name: /^View notifications/ });
    await notificationsButton.focus();
    await page.keyboard.press('Enter');

    const notificationsRegion = page.getByRole('region', { name: 'Notifications' });
    await expect(notificationsRegion).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(notificationsRegion.getByRole('button', { name: /Review your application activity/ })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(notificationsRegion).toBeHidden();
    await expect(notificationsButton).toBeFocused();
  });

  test('account notifications can be marked read from the keyboard', async ({ page }) => {
    await installKeyboardNetworkStubs(page, {
      ...defaultRouteAuditRestFixtures,
      notifications: buildNotificationRows(1, {
        titlePrefix: 'New recruiter message',
        type: 'MESSAGE',
        actionUrl: '/messaging',
      }),
    });
    await installE2EAuth(page, [USER_ROLES.user]);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();

    const notificationsButton = page.getByRole('button', { name: /^View notifications, 1 unread$/ });
    await notificationsButton.focus();
    await page.keyboard.press('Enter');

    const notificationsRegion = page.getByRole('region', { name: 'Notifications' });
    await expect(notificationsRegion).toBeVisible();

    const markReadButton = notificationsRegion.getByRole('button', { name: 'Mark read' });
    await page.keyboard.press('Tab');
    await expect(markReadButton).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /^View notifications$/ })).toBeVisible();
    await expect(markReadButton).toBeHidden();
  });

  test('account notification rows activate their destination from the keyboard', async ({ page }) => {
    await installKeyboardNetworkStubs(page, {
      ...defaultRouteAuditRestFixtures,
      notifications: buildNotificationRows(1, {
        titlePrefix: 'New recruiter message',
        type: 'MESSAGE',
        actionUrl: '/messaging',
      }),
    });
    await installE2EAuth(page, [USER_ROLES.user]);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();

    const notificationsButton = page.getByRole('button', { name: /^View notifications, 1 unread$/ });
    await notificationsButton.focus();
    await page.keyboard.press('Enter');

    const notificationsRegion = page.getByRole('region', { name: 'Notifications' });
    const accountNotification = notificationsRegion.getByRole('button', { name: /New recruiter message 1/ });
    await accountNotification.focus();
    await expect(accountNotification).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/messaging$/);
    await expect(page.getByRole('heading', { name: /^Messages$/ })).toBeVisible();
  });

  test('notification pagination can load more rows from the keyboard', async ({ page }) => {
    await installKeyboardNetworkStubs(page, {
      ...defaultRouteAuditRestFixtures,
      notifications: buildNotificationRows(10, { isRead: true }),
    });
    await installE2EAuth(page, [USER_ROLES.user]);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();

    const notificationsButton = page.getByRole('button', { name: /^View notifications$/ });
    await notificationsButton.focus();
    await page.keyboard.press('Enter');

    const notificationsRegion = page.getByRole('region', { name: 'Notifications' });
    await expect(notificationsRegion.getByText('8 of 10 loaded')).toBeVisible();

    const loadMoreButton = notificationsRegion.getByRole('button', { name: 'Load more notifications' });
    await loadMoreButton.focus();
    await expect(loadMoreButton).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(notificationsRegion.getByRole('button', { name: /Notification 10/ })).toBeVisible();
    await expect(notificationsRegion.getByText('10 of 10 loaded')).toBeVisible();
    await expect(loadMoreButton).toBeHidden();
  });

  test('shared tabs keep roving focus aligned with keyboard selection', async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.user]);
    await page.goto('/lms');
    await expect(page.getByRole('heading', { name: /^Learning$/ })).toBeVisible();

    const tabs = page.getByRole('tablist', { name: 'Section tabs' });
    const allCoursesTab = tabs.getByRole('tab', { name: 'All Courses' });
    const inProgressTab = tabs.getByRole('tab', { name: 'In Progress' });
    const completedTab = tabs.getByRole('tab', { name: 'Completed' });

    await expect(allCoursesTab).toHaveAttribute('aria-selected', 'true');
    await allCoursesTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(inProgressTab).toHaveAttribute('aria-selected', 'true');
    await expect(inProgressTab).toBeFocused();

    await page.keyboard.press('End');
    await expect(completedTab).toHaveAttribute('aria-selected', 'true');
    await expect(completedTab).toBeFocused();

    await page.keyboard.press('Home');
    await expect(allCoursesTab).toHaveAttribute('aria-selected', 'true');
    await expect(allCoursesTab).toBeFocused();
  });

  test('login form submits with Enter from a focused password field', async ({ page }) => {
    await installE2EAuth(page, null);
    await page.goto('/login');

    await page.getByLabel(/^Email/).fill('invalid@test.com');
    const passwordInput = page.getByLabel(/^Password$/);
    await passwordInput.fill('wrongpassword');
    await passwordInput.press('Enter');

    await expect(page.getByTestId('error-message')).toBeVisible();
  });

  test('shared modal traps focus and restores the opener on close', async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.user]);
    await page.goto('/billing');
    await expect(page.getByRole('heading', { name: /^Billing$/ })).toBeVisible();

    const updateButton = page.getByRole('button', { name: /^Update$/ });
    await updateButton.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Update Payment Method' });
    await expect(dialog).toBeVisible();

    const closeButton = dialog.getByRole('button', { name: 'Close modal' });
    const cancelButton = dialog.getByRole('button', { name: 'Cancel' });
    const portalButton = dialog.getByRole('button', { name: /Open Billing Portal/ });

    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(portalButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(cancelButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(updateButton).toBeFocused();
  });
});
