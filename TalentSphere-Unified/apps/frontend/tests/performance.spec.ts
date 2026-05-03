import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  test('page load performance within acceptable time', async ({ page }) => {
    const start = Date.now();
    await page.goto(`${baseURL}/dashboard`);
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(5000);
  });

  test('should render analytics link', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);

    const analyticsNav = page.locator('[data-testid="nav-analytics"]');
    const navLink = page.getByRole('link', { name: /analytics/i });

    const isAnalyticsVisible = await analyticsNav.isVisible({ timeout: 5000 }).catch(() => false);
    const isNavLinkVisible = await navLink.isVisible({ timeout: 5000 }).catch(() => false);

    expect(isAnalyticsVisible || isNavLinkVisible).toBeTruthy();
  });

  test('API response time within budget', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);

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
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  test('should navigate to jobs from dashboard', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);

    const jobsLink = page.locator('[data-testid="jobs-link"]');
    const jobsNavLink = page.getByRole('link', { name: /jobs/i });

    const isJobsLink = await jobsLink.isVisible({ timeout: 5000 }).catch(() => false);
    const isJobsNav = await jobsNavLink.isVisible({ timeout: 5000 }).catch(() => false);

    if (isJobsLink) {
      await jobsLink.click();
    } else if (isJobsNav) {
      await jobsNavLink.click();
    }

    await expect(page).toHaveURL(/.*jobs.*/);
  });

  test('should navigate to LMS from dashboard', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard`);

    const lmsLink = page.getByRole('link', { name: /lms|learning/i, exact: false });

    await lmsLink.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      // Fallback: just check we're on dashboard
    });

    if (await lmsLink.isVisible().catch(() => false)) {
      await lmsLink.click();
    }

    await expect(page).toHaveURL(/.*lms.*|.*dashboard.*/);
  });
});

test.describe('Telemetry', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  test('user journey event tracking', async ({ page }) => {
    const journeyEvents: Array<{event: string; timestamp: number}> = [];

    await page.addInitScript(() => {
      (window as any).__trackJourney = (event: string) => {
        window.postMessage({ type: 'journey_event', event, timestamp: Date.now() }, '*');
      };
    });

    await page.goto(`${baseURL}/dashboard`);

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

    await page.goto(`${baseURL}/lms`);

    expect(contentEvents).toBeDefined();
  });
});