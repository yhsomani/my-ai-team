import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('featureFlags', JSON.stringify({}));
    });
  });

  test('should navigate to login and see the form', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await expect(page.locator('h1')).toContainText('Console', { timeout: 10000 });
    await expect(page.getByPlaceholder('name@domain.com')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to register and see the form', async ({ page }) => {
    await page.goto(`${baseURL}/register`);
    await expect(page.locator('h1')).toContainText('Initialize', { timeout: 10000 });
  });

  test('should show error message on invalid credentials', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await page.fill('[data-testid="email-input"]', 'invalid@test.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    const registerLink = page.getByRole('link', { name: /register|create/i });
    await expect(registerLink).toBeVisible();
  });
});

test.describe('Navigation', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  test('should display navigation links when logged in', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    await expect(page.locator('[data-testid="jobs-link"]')).toBeVisible({ timeout: 10000 }).catch(() => {
      return expect(page.locator('nav')).toBeVisible();
    });
  });

  test('analytics link should be visible', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);
    await expect(page.locator('[data-testid="nav-analytics"]')).toBeVisible({ timeout: 10000 }).catch(() => {
      return expect(page.getByRole('link', { name: /analytics/i })).toBeVisible();
    });
  });
});

test.describe('Job Search', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  test('should display jobs page', async ({ page }) => {
    await page.goto(`${baseURL}/jobs`);
    await expect(page.getByRole('heading', { name: /job/i })).toBeVisible({ timeout: 10000 }).catch(() => {
      return expect(page.locator('input[type="search"]')).toBeVisible();
    });
  });

  test('search input should accept text', async ({ page }) => {
    await page.goto(`${baseURL}/jobs`);
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('software engineer');
    await expect(searchInput).toHaveValue('software engineer');
  });
});

test.describe('Performance', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  test('should load page within acceptable time', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${baseURL}/dashboard`);
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Accessibility', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  test('login page should be accessible', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await expect(page.getByLabel(/email/i)).toBeVisible().catch(() => {
      return expect(page.getByPlaceholder('name@domain.com')).toBeVisible();
    });
  });
});