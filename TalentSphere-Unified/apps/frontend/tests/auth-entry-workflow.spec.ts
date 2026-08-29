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
    await expect(page.getByRole('main', { name: /^Sign in to TalentSphere$/ })).toBeVisible();

    const loginForm = page.getByRole('form', { name: 'Email sign in' });
    await expect(loginForm).toBeVisible();
    await expect(page.getByRole('region', { name: 'Sign in to TalentSphere authentication panel' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Authentication alternate entry' }).getByRole('link', { name: 'Sign up' })).toBeVisible();

    await expect(page.getByRole('button', { name: /GitHub|Google/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Forgot password/i })).toHaveCount(0);

    await loginForm.getByLabel(/^Email/).fill('invalid@test.com');
    const passwordInput = loginForm.getByLabel(/^Password$/);
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
    await expect(page.getByRole('main', { name: /^Create your account$/ })).toBeVisible();

    const registrationForm = page.getByRole('form', { name: 'Account registration' });
    const accountType = registrationForm.getByRole('group', { name: 'Account Type' });
    const nextStep = registrationForm.getByRole('status', { name: 'Registration next step' });
    await expect(registrationForm).toBeVisible();
    await expect(page.getByRole('region', { name: 'Create your account authentication panel' })).toBeVisible();

    const recruiterOption = accountType.getByRole('button', { name: /Recruiter/ });
    const talentOption = accountType.getByRole('button', { name: /Talent/ });
    await expect(recruiterOption).toHaveAttribute('aria-pressed', 'true');
    await expect(recruiterOption).toHaveAttribute('aria-controls', 'registration-next-step');
    await expect(talentOption).toHaveAttribute('aria-pressed', 'false');
    await expect(nextStep).toContainText('Next: company setup');

    await talentOption.click();
    await expect(talentOption).toHaveAttribute('aria-pressed', 'true');
    await expect(recruiterOption).toHaveAttribute('aria-pressed', 'false');
    await expect(nextStep).toContainText('Next: dashboard checklist');
  });
});
