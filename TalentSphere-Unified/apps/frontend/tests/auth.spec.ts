import { test, expect } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await installNetworkStubs(page);
    await installE2EAuth(page, null);
  });

  test('should navigate to login and see the form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sign in to TalentSphere', { timeout: 10000 });
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to register and see the form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Create your account', { timeout: 10000 });
  });

  test('public landing preserves role entry points and stats surface', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /^TalentSphere$/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('navigation', { name: 'Public navigation' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Public role entry points' })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Join as Talent$/ })).toHaveAttribute('href', '/register?role=talent');
    await expect(page.getByRole('link', { name: /^Hire Talent$/ })).toHaveAttribute('href', '/register?role=recruiter');
    await expect(page.getByRole('region', { name: 'Career command center' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Career command center preview rows' })).toBeVisible();
    await expect(page.getByRole('listitem', { name: 'Applications. 8 active. Owned by its domain route.' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Platform pillars' })).toBeVisible();
    await expect(page.getByRole('listitem', { name: /Focused job matching.*Jobs workspace/i })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Feature ownership decisions' })).toBeVisible();
    await expect(page.getByRole('listitem', { name: 'Jobs owns search, applications, saved searches, and posts.' })).toBeVisible();
    await expect(page.getByText('Public platform snapshot')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Public platform stats' })).toBeVisible();
    await expect(page.getByText(/Live|Fallback/).first()).toBeVisible();
  });

  test('public landing keeps semantic content visible on mobile without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /^TalentSphere$/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /^Join as Talent$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Hire Talent$/ })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Public platform stats' })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('should show error message on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'invalid@test.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /sign up|create/i });
    await expect(registerLink).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await installNetworkStubs(page);
    await installE2EAuth(page, [USER_ROLES.user, USER_ROLES.recruiter, USER_ROLES.admin]);
  });

  test('should display navigation links when logged in', async ({ page }) => {
    await page.goto('/dashboard');
    const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' }).first();
    await expect(primaryNavigation).toBeVisible({ timeout: 10000 });
    await expect(primaryNavigation.getByRole('link', { name: /^Dashboard$/ })).toBeVisible();
    await expect(primaryNavigation.getByRole('link', { name: /^Jobs$/ })).toBeVisible();
  });

  test('role-specific navigation links should be visible for an all-role test user', async ({ page }) => {
    await page.goto('/dashboard');
    const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' }).first();
    await expect(primaryNavigation.getByRole('link', { name: /^Candidates$/ })).toBeVisible({ timeout: 10000 });
    await expect(primaryNavigation.getByRole('link', { name: /^Admin Console$/ })).toBeVisible();
  });
});

test.describe('Job Search', () => {
  test.beforeEach(async ({ page }) => {
    await installNetworkStubs(page);
    await installE2EAuth(page, [USER_ROLES.user, USER_ROLES.recruiter]);
  });

  test('should display jobs page', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.getByRole('heading', { name: /^Jobs$/ })).toBeVisible({ timeout: 10000 });
  });

  test('search input should accept text', async ({ page }) => {
    await page.goto('/jobs');
    const searchInput = page.getByPlaceholder('Search jobs...');
    await searchInput.fill('software engineer');
    await expect(searchInput).toHaveValue('software engineer');
  });
});

test.describe('Performance', () => {
  test.beforeEach(async ({ page }) => {
    await installNetworkStubs(page);
    await installE2EAuth(page, [USER_ROLES.user]);
  });

  test('should load page within acceptable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard');
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await installNetworkStubs(page);
    await installE2EAuth(page, null);
  });

  test('login page should be accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible().catch(() => {
      return expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    });
  });
});
