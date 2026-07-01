import { describe, expect, it } from 'vitest';
import {
  appRouteRegistry,
  canAccessRoute,
  getAccessibleNavRoutes,
  getApplicationContentLabel,
  getMobileNavRoutes,
  getRouteById,
  getRouteForPathname,
  getSearchDestinations,
  USER_ROLES,
} from './routeRegistry';
import { getPrimaryFeatureForRoute } from './featureOwnership';

describe('routeRegistry', () => {
  it('keeps protected route permissions in the shared route definitions', () => {
    const adminRoute = getRouteById('admin');
    const candidatesRoute = getRouteById('candidates');
    const postJobRoute = getRouteById('job-post');

    expect(adminRoute?.allowedRoles).toEqual([USER_ROLES.admin]);
    expect(candidatesRoute?.allowedRoles).toEqual([USER_ROLES.recruiter]);
    expect(postJobRoute?.allowedRoles).toEqual([USER_ROLES.recruiter]);
    expect(canAccessRoute(adminRoute!, [USER_ROLES.recruiter])).toBe(false);
    expect(canAccessRoute(candidatesRoute!, [USER_ROLES.recruiter])).toBe(true);
  });

  it('filters desktop navigation from the same role rules used by protected routes', () => {
    const userNav = getAccessibleNavRoutes('main', [USER_ROLES.user]).map((route) => route.path);
    const recruiterNav = getAccessibleNavRoutes('main', [USER_ROLES.recruiter]).map((route) => route.path);
    const adminNav = getAccessibleNavRoutes('main', [USER_ROLES.admin]).map((route) => route.path);

    expect(userNav).toContain('/jobs');
    expect(userNav).toContain('/lms');
    expect(userNav).not.toContain('/candidates');
    expect(recruiterNav).toContain('/jobs');
    expect(recruiterNav).toContain('/candidates');
    expect(recruiterNav).not.toContain('/lms');
    expect(adminNav).toContain('/admin');
    expect(adminNav).not.toContain('/jobs');
  });

  it('derives mobile navigation priorities by role', () => {
    expect(getMobileNavRoutes([USER_ROLES.user]).map((route) => route.path)).toEqual([
      '/dashboard',
      '/jobs',
      '/lms',
      '/challenges',
      '/messaging',
    ]);

    expect(getMobileNavRoutes([USER_ROLES.recruiter]).map((route) => route.path)).toEqual([
      '/dashboard',
      '/jobs',
      '/candidates',
      '/messaging',
      '/networking',
    ]);

    expect(getMobileNavRoutes([USER_ROLES.admin]).map((route) => route.path)).toEqual([
      '/dashboard',
      '/admin',
      '/messaging',
      '/profile',
      '/settings',
    ]);
  });

  it('filters header search destinations through route permissions', () => {
    const userSearch = getSearchDestinations([USER_ROLES.user]).map((route) => route.path);
    const recruiterSearch = getSearchDestinations([USER_ROLES.recruiter]).map((route) => route.path);
    const adminSearch = getSearchDestinations([USER_ROLES.admin]).map((route) => route.path);

    expect(userSearch).toContain('/dashboard');
    expect(userSearch).toContain('/jobs');
    expect(userSearch).toContain('/lms');
    expect(userSearch).toContain('/resume');
    expect(userSearch).toContain('/career-path');
    expect(userSearch).toContain('/billing');
    expect(userSearch).not.toContain('/candidates');
    expect(userSearch).not.toContain('/jobs/post');
    expect(recruiterSearch).toContain('/candidates');
    expect(recruiterSearch).toContain('/jobs/post');
    expect(recruiterSearch).not.toContain('/lms');
    expect(adminSearch).toContain('/admin');
    expect(adminSearch).toContain('/dashboard');
    expect(adminSearch).not.toContain('/jobs');
    expect(adminSearch).not.toContain('/jobs/post');
  });

  it('keeps every route id unique so App route mapping stays deterministic', () => {
    const ids = appRouteRegistry.map((route) => route.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('matches exact, command, and dynamic route paths for shell landmark naming', () => {
    expect(getRouteForPathname('/dashboard')?.id).toBe('dashboard');
    expect(getRouteForPathname('/jobs/post')?.id).toBe('job-post');
    expect(getRouteForPathname('/profile/e2e-role_user')?.id).toBe('profile-detail');
    expect(getRouteForPathname('/jobs/post/')).toEqual(getRouteById('job-post'));
    expect(getRouteForPathname('/profile/e2e-role_user?source=networking#summary')?.id).toBe('profile-detail');
    expect(getRouteForPathname('/jobs/post/extra')).toBeUndefined();
    expect(getRouteForPathname('/unknown-protected-path')).toBeUndefined();
  });

  it('derives route-specific application content labels from the route registry', () => {
    expect(getApplicationContentLabel('/dashboard')).toBe('Dashboard application content');
    expect(getApplicationContentLabel('/jobs/post')).toBe('Post Job application content');
    expect(getApplicationContentLabel('/profile/e2e-role_user')).toBe('Profile Detail application content');
    expect(getApplicationContentLabel('/unknown-protected-path')).toBe('Application content');
  });

  it('keeps primary and account navigation limited to source-backed route owners', () => {
    const mainNavigationIds = appRouteRegistry
      .filter((route) => route.navSection === 'main')
      .map((route) => route.id);
    const accountNavigationIds = appRouteRegistry
      .filter((route) => route.navSection === 'account')
      .map((route) => route.id);

    expect(mainNavigationIds).toEqual([
      'dashboard',
      'jobs',
      'candidates',
      'learning',
      'challenges',
      'networking',
      'ai',
      'messaging',
      'admin',
    ]);
    expect(accountNavigationIds).toEqual(['settings', 'profile']);

    for (const route of appRouteRegistry.filter((candidate) => candidate.navSection)) {
      const feature = getPrimaryFeatureForRoute(route.id);

      expect(feature, `${route.id} navigation route should have a primary feature owner`).toBeDefined();
      expect(feature?.necessity).toBe('necessary');
      expect(feature?.owner).toMatchObject({ kind: 'route', routeId: route.id, routePath: route.path });
    }
  });

  it('documents searchable utility routes as secondary command-search destinations', () => {
    const searchableUtilityRoutes = appRouteRegistry.filter((route) => route.search && !route.navSection);

    expect(searchableUtilityRoutes.map((route) => route.id)).toEqual([
      'billing',
      'resume',
      'career-path',
      'job-post',
    ]);

    for (const route of searchableUtilityRoutes) {
      const feature = getPrimaryFeatureForRoute(route.id);

      expect(feature, `${route.id} searchable utility route should have a primary feature owner`).toBeDefined();
      expect(feature?.secondaryEntryPoints).toContainEqual(expect.objectContaining({
        mode: 'search-destination',
        routeId: route.id,
        routePath: route.path,
      }));
    }
  });
});
