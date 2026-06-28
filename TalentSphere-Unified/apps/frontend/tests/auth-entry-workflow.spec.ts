import { expect, test } from '@playwright/test';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

test.describe('auth entry workflow', () => {
  test.beforeEach(async ({ page }) => {
    await installNetworkStubs(page);
    await installE2EAuth(page, null);
  });

  test('keeps login focused on configured email credentials and accessible errors', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /^Sign in to TalentSphere$/ })).toBeVisible();

    await expect(page.getByRole('button', { name: /GitHub|Google/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Forgot password/i })).toHaveCount(0);

    await page.getByLabel(/^Email/).fill('invalid@test.com');
    const passwordInput = page.getByLabel(/^Password$/);
    await passwordInput.fill('wrongpassword');
    await passwordInput.press('Enter');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Invalid login credentials');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('preserves recruiter role intent from public entry links', async ({ page }) => {
    await page.goto('/register?role=recruiter');
    await expect(page.getByRole('heading', { name: /^Create your account$/ })).toBeVisible();

    const recruiterOption = page.getByRole('button', { name: /Recruiter/ });
    const talentOption = page.getByRole('button', { name: /Talent/ });
    await expect(recruiterOption).toHaveAttribute('aria-pressed', 'true');
    await expect(talentOption).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('Next: company setup')).toBeVisible();

    await talentOption.click();
    await expect(talentOption).toHaveAttribute('aria-pressed', 'true');
    await expect(recruiterOption).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('Next: dashboard checklist')).toBeVisible();
  });
});
