import { expect, test } from '@playwright/test';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

test.describe('admin operational console', () => {
  test.beforeEach(async ({ page }) => {
    await installNetworkStubs(page);
    await installE2EAuth(page, ['ROLE_ADMIN']);
  });

  test('renders source-labeled operational surfaces with scheduler status', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: /^Admin Console$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Product Analytics Insights$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Scheduled Automations$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Service Health$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Audit Log$/ })).toBeVisible();

    await expect(page.getByText('Saved Search Discovery', { exact: true })).toBeVisible();
    await expect(page.getByText('Networking Reminder Delivery', { exact: true })).toBeVisible();
    await expect(page.getByText('Notification Digest Delivery', { exact: true })).toBeVisible();
    await expect(page.getByText(/Source:/)).toBeVisible();
  });
});
