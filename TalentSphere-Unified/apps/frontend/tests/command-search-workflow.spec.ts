import { expect, test } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';
import { defaultRouteAuditRestFixtures } from './helpers/routeAudit';

test.describe('command search workflow', () => {
  test.beforeEach(async ({ page }) => {
    await installNetworkStubs(page, { rest: defaultRouteAuditRestFixtures });
  });

  test('uses route labels to prioritize utility destinations', async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.user]);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();

    const searchInput = page.getByRole('combobox', { name: 'Search platform' });
    await page.keyboard.press('Control+KeyK');
    await expect(searchInput).toBeFocused();
    await expect(searchInput).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K');

    await searchInput.fill('resume');
    const resumeOption = page.getByRole('option', { name: /^Resume/ });
    await expect(resumeOption).toBeVisible();
    await expect(resumeOption).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/resume$/);
    await expect(page.getByRole('heading', { name: /^Resume Builder$/ })).toBeVisible();
  });

  test('keeps recruiter-only destinations out of talent search results', async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.user]);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();

    const searchInput = page.getByRole('combobox', { name: 'Search platform' });
    await page.keyboard.press('Control+KeyK');
    await searchInput.fill('post job');

    await expect(page.getByRole('option', { name: /^Post Job/ })).toHaveCount(0);
    await expect(page.getByText('No matching destinations')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('opens recruiter command routes from role-visible search results', async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.recruiter]);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Recruiter Console$/ })).toBeVisible();

    const searchInput = page.getByRole('combobox', { name: 'Search platform' });
    await page.keyboard.press('Control+KeyK');
    await searchInput.fill('post job');

    const postJobOption = page.getByRole('option', { name: /^Post Job/ });
    await expect(postJobOption).toBeVisible();
    await expect(postJobOption).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/jobs\/post$/);
    await expect(page.getByRole('heading', { name: /^(Create Job Draft|Edit Job Draft)$/ })).toBeVisible();
  });
});
