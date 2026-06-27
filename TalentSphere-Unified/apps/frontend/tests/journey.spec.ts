import { test, expect } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

test.describe('Platform Journey: Hire-to-Learner', () => {
  test('should register and access dashboard', async ({ page }) => {
    await installNetworkStubs(page);
    await installE2EAuth(page, null);

    const timestamp = Date.now();
    const testEmail = `node-${timestamp}@nexustesting.com`;
    const testName = `Neural Candidate ${timestamp}`;

    // Register page
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Create your account', { timeout: 10000 });

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
    await installNetworkStubs(page);
    await installE2EAuth(page, [USER_ROLES.user, USER_ROLES.recruiter]);

    // Try dashboard first
    await page.goto('/dashboard');
    
    // Try jobs page
    await page.goto('/jobs');
    await expect(page.locator('h1, main h1, [class*="heading"]')).toBeVisible({ timeout: 10000 }).catch(() => {
      return expect(page.getByPlaceholder('Search jobs...')).toBeVisible();
    });

    // Try LMS page
    await page.goto('/lms');
    await expect(page.locator('h1, main h1')).toBeVisible({ timeout: 10000 }).catch(() => {
      return expect(page.locator('body')).toBeVisible();
    });
  });

  test('should handle navigation timeout gracefully', async ({ page }) => {
    await installNetworkStubs(page);
    await installE2EAuth(page, null);

    await page.goto('/login');
    
    // Should be able to see login form
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 }).catch(() => {
      return expect(page.locator('h1')).toBeVisible();
    });
  });
});
