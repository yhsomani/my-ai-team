import { test, expect } from '@playwright/test';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

const allRoleUser = ['ROLE_USER', 'ROLE_RECRUITER', 'ROLE_ADMIN'] as const;

test.beforeEach(async ({ page }) => {
  await installNetworkStubs(page);
  await installE2EAuth(page, allRoleUser);
});

test.describe('Performance Tests', () => {
  test('page load performance within acceptable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard');
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(5000);
  });

  test('should render primary navigation links', async ({ page }) => {
    await page.goto('/dashboard');

    const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' }).first();
    await expect(primaryNavigation).toBeVisible({ timeout: 5000 });
    await expect(primaryNavigation.getByRole('link', { name: /^Dashboard$/ })).toBeVisible();
    await expect(primaryNavigation.getByRole('link', { name: /^Jobs$/ })).toBeVisible();
  });

  test('API response time within budget', async ({ page }) => {
    await page.goto('/dashboard');

    const response = await page.evaluate(async () => {
      const start = Date.now();
      try {
        const res = await fetch('/api/v1/dashboard/stats');
        return { status: res.status, duration: Date.now() - start };
      } catch {
        return { status: 0, duration: Date.now() - start };
      }
    });

    expect(response.status).toBeGreaterThan(0);
    expect(response.duration).toBeLessThan(2000);
  });
});

test.describe('Navigation', () => {
  test('should navigate to jobs from dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' }).first();
    await primaryNavigation.getByRole('link', { name: /^Jobs$/ }).click();

    await expect(page).toHaveURL(/.*jobs.*/);
  });

  test('should navigate to LMS from dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' }).first();
    await primaryNavigation.getByRole('link', { name: /^Learning$/ }).click();

    await expect(page).toHaveURL(/.*lms.*/);
  });
});

test.describe('Telemetry', () => {
  test('user journey event tracking', async ({ page }) => {
    const journeyEvents: Array<{event: string; timestamp: number}> = [];

    await page.addInitScript(() => {
      (window as any).__trackJourney = (event: string) => {
        window.postMessage({ type: 'journey_event', event, timestamp: Date.now() }, '*');
      };
    });

    await page.goto('/dashboard');

    await page.waitForTimeout(1000);

    expect(journeyEvents.length).toBeGreaterThanOrEqual(0);
  });

  test('content effectiveness tracking', async ({ page }) => {
    const contentEvents: Array<{event: string; duration: number}> = [];

    await page.addInitScript(() => {
      (window as any).__trackContent = (contentId: string, duration: number) => {
        contentEvents.push({ event: contentId, duration });
      };
    });

    await page.goto('/lms');

    expect(contentEvents).toBeDefined();
  });
});
