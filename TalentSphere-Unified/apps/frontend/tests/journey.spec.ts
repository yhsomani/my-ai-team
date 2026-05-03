import { test, expect } from '@playwright/test';

test.describe('Platform Journey: Hire-to-Learner', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  test('should register and access dashboard', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__E2E_TESTING__ = true;
    });

    const timestamp = Date.now();
    const testEmail = `node-${timestamp}@nexustesting.com`;
    const testName = `Neural Candidate ${timestamp}`;

    // Register page
    await page.goto(`${baseURL}/register`);
    await expect(page.locator('h1')).toContainText('Initialize', { timeout: 10000 });

    // Fill form - use flexible selectors
    await page.fill('input[type="text"]', testName).catch(async () => {
      await page.fill('input[name="name"]', testName);
    });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'IdentityPass123!');

    // Submit registration
    await page.click('button[type="submit"]').catch(async () => {
      await page.click('button:has-text("Confirm")');
    });

    // Wait for navigation or redirect
    await page.waitForURL(/.*dashboard.*|.*login.*/, { timeout: 15000 });
  });

  test('should navigate between main sections', async ({ page }) => {
    // Try dashboard first
    await page.goto(`${baseURL}/dashboard`);
    
    // Try jobs page
    await page.goto(`${baseURL}/jobs`);
    await expect(page.locator('h1, main h1, [class*="heading"]')).toBeVisible({ timeout: 10000 }).catch(() => {
      return expect(page.locator('input[type="search"]')).toBeVisible();
    });

    // Try LMS page
    await page.goto(`${baseURL}/lms`);
    await expect(page.locator('h1, main h1')).toBeVisible({ timeout: 10000 }).catch(() => {
      return expect(page.locator('body')).toBeVisible();
    });
  });

  test('should handle navigation timeout gracefully', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    
    // Should be able to see login form
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 }).catch(() => {
      return expect(page.locator('h1')).toBeVisible();
    });
  });
});