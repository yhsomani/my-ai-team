import { expect, test } from '@playwright/test';
import {
  appRouteRegistry,
  canAccessRoute,
  getMobileNavRoutes,
  USER_ROLES,
  type AppRouteDefinition,
} from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

const exactName = (label: string) => new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

const toConcretePath = (route: AppRouteDefinition) => route.path.replace(':userId', 'e2e-user-001');

const roleCases = [
  {
    name: 'talent',
    roles: [USER_ROLES.user],
    allowedPath: '/lms',
    allowedHeading: /^Learning$/,
    deniedPath: '/admin',
  },
  {
    name: 'recruiter',
    roles: [USER_ROLES.recruiter],
    allowedPath: '/candidates',
    allowedHeading: /^Candidates$/,
    deniedPath: '/lms',
  },
  {
    name: 'admin',
    roles: [USER_ROLES.admin],
    allowedPath: '/admin',
    allowedHeading: /^Admin Console$/,
    deniedPath: '/jobs',
  },
] as const;

test.describe('route access matrix', () => {
  test.beforeEach(async ({ page }) => {
    await installNetworkStubs(page);
  });

  test('redirects unauthenticated users from protected routes to login', async ({ page }) => {
    await installE2EAuth(page, null);

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  });

  for (const roleCase of roleCases) {
    test(`${roleCase.name} sees only route-registry allowed navigation links`, async ({ page }) => {
      await installE2EAuth(page, roleCase.roles);

      await page.goto('/dashboard');

      const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' }).first();
      await expect(primaryNavigation).toBeVisible();

      const visibleRoutes = appRouteRegistry.filter((route) => (
        route.navSection && canAccessRoute(route, roleCase.roles)
      ));
      const hiddenRoutes = appRouteRegistry.filter((route) => (
        route.navSection && !canAccessRoute(route, roleCase.roles)
      ));

      for (const route of visibleRoutes) {
        await expect(primaryNavigation.getByRole('link', { name: exactName(route.label) })).toBeVisible();
      }

      for (const route of hiddenRoutes) {
        await expect(primaryNavigation.getByRole('link', { name: exactName(route.label) })).toHaveCount(0);
      }
    });

    test(`${roleCase.name} can open allowed routes and is redirected from denied routes`, async ({ page }) => {
      await installE2EAuth(page, roleCase.roles);

      await page.goto(roleCase.allowedPath);
      await expect(page.getByRole('heading', { name: roleCase.allowedHeading })).toBeVisible();

      await page.goto(roleCase.deniedPath);
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test(`${roleCase.name} mobile bottom navigation follows registry priority`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await installE2EAuth(page, roleCase.roles);

      await page.goto('/dashboard');

      const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation' });
      await expect(mobileNavigation).toBeVisible();

      const renderedLabels = (await mobileNavigation.getByRole('link').allTextContents())
        .map((label) => label.trim())
        .filter(Boolean);
      const expectedLabels = getMobileNavRoutes(roleCase.roles).map((route) => route.label);

      expect(renderedLabels).toEqual(expectedLabels);
    });
  }

  test('registry restricted routes match direct-role expectations', () => {
    const restrictedRoutes = appRouteRegistry.filter((route) => route.allowedRoles);

    expect(restrictedRoutes.map(toConcretePath)).toEqual([
      '/jobs',
      '/candidates',
      '/lms',
      '/challenges',
      '/admin',
      '/jobs/post',
    ]);

    expect(canAccessRoute(appRouteRegistry.find((route) => route.path === '/admin')!, [USER_ROLES.user])).toBe(false);
    expect(canAccessRoute(appRouteRegistry.find((route) => route.path === '/candidates')!, [USER_ROLES.recruiter])).toBe(true);
    expect(canAccessRoute(appRouteRegistry.find((route) => route.path === '/jobs')!, [USER_ROLES.admin])).toBe(false);
  });
});
