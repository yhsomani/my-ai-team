import { expect, test } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';
import { defaultRouteAuditRestFixtures } from './helpers/routeAudit';

test.describe('not found recovery workflow', () => {
  test.beforeEach(async ({ page }) => {
    await installNetworkStubs(page, { rest: defaultRouteAuditRestFixtures });
  });

  test('routes public visitors back to auth entry points without exposing app destinations', async ({ page }) => {
    await installE2EAuth(page, null);

    await page.goto('/missing-public-route');

    await expect(page.getByRole('heading', { name: /^Page not found$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Sign in$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Create talent account$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Create recruiter account$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Dashboard$/ })).toHaveCount(0);

    await page.getByRole('button', { name: /^Create recruiter account$/ }).click();

    await expect(page).toHaveURL(/\/register\?role=recruiter$/);
    await expect(page.getByRole('heading', { name: /^Create your account$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Recruiter/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('shows role-filtered recovery destinations for authenticated users', async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.recruiter]);

    await page.goto('/missing-recruiter-route');

    await expect(page.getByRole('heading', { name: /^Page not found$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Dashboard$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Jobs/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Candidates/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Learning/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Challenges/ })).toHaveCount(0);

    await page.getByRole('button', { name: /^Candidates/ }).click();

    await expect(page).toHaveURL(/\/candidates$/);
    await expect(page.getByRole('heading', { name: /^Candidates$/ })).toBeVisible();
  });
});
