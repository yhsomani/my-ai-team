import { expect, type Page, test } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

type JsonRecord = Record<string, unknown>;

const userId = 'e2e-role_user';

const buildNotificationSettingsFixture = (overrides: JsonRecord = {}): JsonRecord => ({
  id: 'notification-settings-e2e',
  user_id: userId,
  email_notifications: true,
  push_notifications: false,
  sms_notifications: false,
  job_alerts: true,
  message_notifications: true,
  newsletter: false,
  digest_frequency: 'daily',
  quiet_hours_enabled: false,
  quiet_hours_start: '18:00',
  quiet_hours_end: '09:00',
  created_at: '2026-06-27T09:00:00.000Z',
  updated_at: '2026-06-27T09:00:00.000Z',
  ...overrides,
});

const subscriptionFixture: JsonRecord = {
  id: 'subscription-e2e',
  user_id: userId,
  plan_id: 'plan-e2e-pro',
  status: 'ACTIVE',
  next_billing_date: '2026-08-01T00:00:00.000Z',
  payment_method: 'Visa ending in 4242',
  created_at: '2026-06-27T09:00:00.000Z',
  subscription_plans: {
    name: 'Talent Pro',
    price: 4900,
    currency: 'USD',
    interval: 'month',
  },
};

const paymentFixture: JsonRecord = {
  id: 'payment-e2e',
  user_id: userId,
  amount: 4900,
  currency: 'USD',
  status: 'PAID',
  created_at: '2026-06-27T09:30:00.000Z',
};

const createCaptures = () => ({
  profileIdentityUpdates: [] as Array<{ payload: JsonRecord; context: { id?: string } }>,
  userProfileUpdates: [] as Array<{ payload: JsonRecord; context: { userId?: string } }>,
  notificationInserts: [] as JsonRecord[],
  notificationUpdates: [] as Array<{ payload: JsonRecord; context: { id?: string; userId?: string } }>,
  analyticsInserts: [] as JsonRecord[],
});

const getAnalyticsActions = (captures: ReturnType<typeof createCaptures>) => (
  captures.analyticsInserts
    .map(event => event.metadata)
    .filter((metadata): metadata is JsonRecord => Boolean(metadata) && typeof metadata === 'object' && !Array.isArray(metadata))
    .map(metadata => metadata.action)
);

const expectAnalyticsAction = async (
  captures: ReturnType<typeof createCaptures>,
  action: string,
) => {
  await expect.poll(() => getAnalyticsActions(captures).includes(action)).toBeTruthy();
};

const getSettingsNav = (page: Page) => (
  page.locator('nav').filter({
    has: page.getByRole('tab', { name: 'Profile Settings', exact: true }),
  }).first()
);

const setSwitchChecked = async (page: Page, name: string | RegExp, checked: boolean) => {
  const control = page.getByRole('switch', { name });
  if (await control.isChecked() === checked) return;

  await control.focus();
  await page.keyboard.press('Space');
  await expect(control).toBeChecked({ checked });
};

const installSettingsWorkflowStubs = async (
  page: Page,
  captures: ReturnType<typeof createCaptures>,
  options: { failFirstNotificationUpdate?: boolean; notificationSettings?: JsonRecord[] } = {},
) => {
  let notificationUpdateAttempts = 0;

  await installNetworkStubs(page, {
    rest: {
      notificationSettings: options.notificationSettings || [buildNotificationSettingsFixture()],
      subscriptions: [subscriptionFixture],
      payments: [paymentFixture],
      notifications: [],
      onProfileIdentityUpdate: (payload, context) => {
        captures.profileIdentityUpdates.push({ payload, context });
        return {
          id: context.id || userId,
          email: 'e2e@talentsphere.test',
          full_name: typeof payload.full_name === 'string' ? payload.full_name : 'E2E User',
          first_name: typeof payload.first_name === 'string' ? payload.first_name : 'E2E',
          last_name: typeof payload.last_name === 'string' ? payload.last_name : 'User',
          updated_at: '2026-06-27T10:00:00.000Z',
          ...payload,
        };
      },
      onUserProfileUpdate: (payload, context) => {
        captures.userProfileUpdates.push({ payload, context });
        return {
          id: 'user-profile-e2e-settings',
          user_id: context.userId || userId,
          headline: typeof payload.headline === 'string' ? payload.headline : '',
          location: typeof payload.location === 'string' ? payload.location : '',
          updated_at: '2026-06-27T10:00:00.000Z',
          ...payload,
        };
      },
      onNotificationSettingsInsert: (payload) => {
        captures.notificationInserts.push(payload);
        return buildNotificationSettingsFixture({
          id: 'notification-settings-e2e-inserted',
          ...payload,
        });
      },
      onNotificationSettingsUpdate: (payload, context) => {
        notificationUpdateAttempts += 1;
        captures.notificationUpdates.push({ payload, context });
        if (options.failFirstNotificationUpdate && notificationUpdateAttempts === 1) {
          throw new Error('notification settings unavailable');
        }

        return buildNotificationSettingsFixture({
          id: context.id || 'notification-settings-e2e',
          user_id: context.userId || userId,
          ...payload,
        });
      },
      onProductAnalyticsInsert: (payload) => {
        captures.analyticsInserts.push(payload);
        return {
          id: typeof payload.id === 'string' ? payload.id : 'settings-analytics-e2e',
          occurred_at: typeof payload.occurred_at === 'string' ? payload.occurred_at : '2026-06-27T10:00:00.000Z',
          ...payload,
        };
      },
    },
  });
};

test.describe('Settings workflow', () => {
  test.beforeEach(async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.user]);
  });

  test('saves profile settings, notification delivery preferences, and opens Billing handoff', async ({ page }) => {
    const captures = createCaptures();
    await installSettingsWorkflowStubs(page, captures);

    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: /^Settings$/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();

    await page.getByLabel('First Name').fill('Priya');
    await page.getByLabel('Last Name').fill('Rao');
    await page.getByLabel('Professional Headline').fill('Product Analytics Lead');
    await page.getByLabel('Location').fill('Austin, TX');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Profile settings saved')).toBeVisible();
    await expect.poll(() => captures.profileIdentityUpdates.length).toBe(1);
    await expect.poll(() => captures.userProfileUpdates.length).toBe(1);
    expect(captures.profileIdentityUpdates[0].context).toEqual({ id: userId });
    expect(captures.profileIdentityUpdates[0].payload).toMatchObject({
      first_name: 'Priya',
      last_name: 'Rao',
      full_name: 'Priya Rao',
    });
    expect(captures.userProfileUpdates[0].context).toEqual({ userId });
    expect(captures.userProfileUpdates[0].payload).toMatchObject({
      headline: 'Product Analytics Lead',
      location: 'Austin, TX',
    });
    await expectAnalyticsAction(captures, 'profile_settings_saved');

    await getSettingsNav(page).getByRole('tab', { name: 'Notifications', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Notification Preferences' })).toBeVisible();

    await expect(page.getByRole('switch', { name: 'Email Notifications' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Push Notifications' })).not.toBeChecked();
    await setSwitchChecked(page, 'Push Notifications', true);
    await setSwitchChecked(page, 'Job Alerts', false);
    await page.getByLabel('Digest frequency').selectOption('weekly');
    await setSwitchChecked(page, /Quiet hours/, true);
    await page.getByLabel('Start').fill('20:30');
    await page.getByLabel('End').fill('07:15');

    await expect(page.getByText('Current delivery preference: Weekly Digest; quiet hours 20:30-07:15.')).toBeVisible();
    await page.getByRole('button', { name: 'Save Preferences' }).click();

    await expect(page.getByText('Notification preferences saved')).toBeVisible();
    await expect.poll(() => captures.notificationUpdates.length).toBe(1);
    expect(captures.notificationUpdates[0].context).toEqual({ id: undefined, userId });
    expect(captures.notificationUpdates[0].payload).toMatchObject({
      email_notifications: true,
      push_notifications: true,
      job_alerts: false,
      message_notifications: true,
      digest_frequency: 'weekly',
      quiet_hours_enabled: true,
      quiet_hours_start: '20:30',
      quiet_hours_end: '07:15',
    });
    expect(captures.notificationInserts).toEqual([]);
    await expectAnalyticsAction(captures, 'notification_settings_saved');

    await getSettingsNav(page).getByRole('tab', { name: 'Billing & Plans', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Billing Summary' })).toBeVisible();
    await expect(page.getByText('Talent Pro')).toBeVisible();
    await expect(page.getByText('Visa ending in 4242')).toBeVisible();
    await expect(page.getByText('1 invoice')).toBeVisible();

    await page.getByRole('button', { name: /Open Billing/ }).click();
    await expect(page).toHaveURL(/\/billing$/);
    await expectAnalyticsAction(captures, 'billing_handoff_opened');
  });

  test('reviews password reset and account deactivation before security actions', async ({ page }) => {
    const captures = createCaptures();
    await installSettingsWorkflowStubs(page, captures);

    await page.goto('/settings');
    await getSettingsNav(page).getByRole('tab', { name: 'Security', exact: true }).click();

    await page.getByRole('button', { name: 'Update Password' }).click();
    await expect(page.getByRole('dialog', { name: 'Update Password' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog', { name: 'Update Password' })).toBeHidden();
    await expectAnalyticsAction(captures, 'password_reset_cancelled');

    await page.getByRole('button', { name: 'Update Password' }).click();
    const resetRequestPromise = page.waitForRequest(request => (
      request.method() === 'POST' && request.url().includes('/auth/v1/recover')
    ));
    await page.getByRole('button', { name: 'Send Reset Email' }).click();
    const resetRequest = await resetRequestPromise;
    expect(resetRequest.postData() || '').toContain('e2e@talentsphere.test');
    await expect(page.getByText('Password reset email sent')).toBeVisible();
    await expectAnalyticsAction(captures, 'password_reset_completed');

    await page.getByRole('button', { name: 'Deactivate Account' }).click();
    const deactivationDialog = page.getByRole('dialog', { name: 'Deactivate Account' });
    await expect(deactivationDialog).toBeVisible();
    await expect(deactivationDialog.getByRole('button', { name: 'Confirm Deactivation' })).toBeDisabled();
    await page.getByLabel('Confirmation').fill('not yet');
    await expect(deactivationDialog.getByRole('button', { name: 'Confirm Deactivation' })).toBeDisabled();
    await deactivationDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(captures.profileIdentityUpdates).toEqual([]);
    await expectAnalyticsAction(captures, 'account_delete_cancelled');

    await page.getByRole('button', { name: 'Deactivate Account' }).click();
    await page.getByLabel('Confirmation').fill(' deactivate ');
    await expect(deactivationDialog.getByRole('button', { name: 'Confirm Deactivation' })).toBeEnabled();
    await deactivationDialog.getByRole('button', { name: 'Confirm Deactivation' }).click();

    await expect(page.getByText('Account deactivated')).toBeVisible();
    await expect.poll(() => captures.profileIdentityUpdates.length).toBe(1);
    expect(captures.profileIdentityUpdates[0].context).toEqual({ id: userId });
    expect(captures.profileIdentityUpdates[0].payload).toMatchObject({
      is_active: false,
    });
    expect(typeof captures.profileIdentityUpdates[0].payload.deleted_at).toBe('string');
    await expectAnalyticsAction(captures, 'account_delete_completed');
  });

  test('keeps notification edits available after a failed save and succeeds on retry', async ({ page }) => {
    const captures = createCaptures();
    await installSettingsWorkflowStubs(page, captures, { failFirstNotificationUpdate: true });

    await page.goto('/settings');
    await getSettingsNav(page).getByRole('tab', { name: 'Notifications', exact: true }).click();
    await setSwitchChecked(page, 'Messages', false);
    await page.getByLabel('Digest frequency').selectOption('off');

    await page.getByRole('button', { name: 'Save Preferences' }).click();
    await expect(page.getByText('Failed to save preferences')).toBeVisible();
    await expect.poll(() => captures.notificationUpdates.length).toBe(1);
    await expectAnalyticsAction(captures, 'notification_settings_save_failed');

    await expect(page.getByRole('switch', { name: 'Messages' })).not.toBeChecked();
    await expect(page.getByLabel('Digest frequency')).toHaveValue('off');

    await page.getByRole('button', { name: 'Save Preferences' }).click();
    await expect(page.getByText('Notification preferences saved')).toBeVisible();
    await expect.poll(() => captures.notificationUpdates.length).toBe(2);
    expect(captures.notificationUpdates[1].payload).toMatchObject({
      message_notifications: false,
      digest_frequency: 'off',
    });
    await expectAnalyticsAction(captures, 'notification_settings_saved');
  });
});
