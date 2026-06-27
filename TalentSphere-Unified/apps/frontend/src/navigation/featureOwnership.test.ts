import { describe, expect, it } from 'vitest';
import { appRouteRegistry } from './routeRegistry';
import {
  featureOwnershipRegistry,
  getFeatureOwnershipById,
  getPrimaryFeatureForRoute,
  getSecondaryFeatureEntryPointsForRoute,
  publicRoutePaths,
} from './featureOwnership';

const routeById = new Map(appRouteRegistry.map((route) => [route.id, route]));
const routeIds = appRouteRegistry.map((route) => route.id).sort();

describe('featureOwnership', () => {
  it('keeps every feature ownership id unique', () => {
    const ids = featureOwnershipRegistry.map((feature) => feature.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('assigns exactly one primary feature owner to every protected route', () => {
    const ownedRouteIds = featureOwnershipRegistry.flatMap((feature) => (
      feature.owner.kind === 'route' ? [feature.owner.routeId] : []
    )).sort();

    expect(ownedRouteIds).toEqual(routeIds);

    for (const routeId of routeIds) {
      expect(getPrimaryFeatureForRoute(routeId)?.owner).toMatchObject({ kind: 'route', routeId });
    }
  });

  it('keeps route owner paths and role restrictions aligned with the route registry', () => {
    for (const feature of featureOwnershipRegistry) {
      if (feature.owner.kind !== 'route') continue;

      const route = routeById.get(feature.owner.routeId);
      expect(route, `${feature.id} route owner should exist`).toBeDefined();
      expect(feature.owner.routePath).toBe(route?.path);

      if (feature.allowedRoles) {
        expect(feature.allowedRoles).toEqual(route?.allowedRoles);
      }
    }
  });

  it('keeps public route owners aligned with known public routes', () => {
    const ownedPublicRoutes = featureOwnershipRegistry.flatMap((feature) => (
      feature.owner.kind === 'public-route' ? [feature.owner.routePath] : []
    )).sort();

    expect(ownedPublicRoutes).toEqual([...publicRoutePaths].sort());
  });

  it('documents secondary entry points as non-owner links, summaries, searches, or reviewed handoffs', () => {
    for (const feature of featureOwnershipRegistry) {
      expect(feature.primaryPurpose.trim().length).toBeGreaterThan(20);
      expect(feature.consolidationDecision.trim().length).toBeGreaterThan(20);
      expect(feature.behaviorPreservation.trim().length).toBeGreaterThan(20);

      for (const entry of feature.secondaryEntryPoints) {
        expect(entry.rationale.trim().length).toBeGreaterThan(20);

        if (entry.routeId) {
          const route = routeById.get(entry.routeId);
          expect(route, `${feature.id} secondary route ${entry.routeId} should exist`).toBeDefined();

          if (entry.routePath) {
            expect(entry.routePath).toBe(route?.path);
          }

          if (feature.owner.kind === 'route') {
            expect(`${entry.routeId}:${entry.mode}`).not.toBe(`${feature.owner.routeId}:summary`);
          }
        }
      }
    }
  });

  it('keeps candidate merge decisions explicit instead of removing routes silently', () => {
    const careerPath = getFeatureOwnershipById('career-path');

    expect(careerPath?.necessity).toBe('candidate-for-merge');
    expect(careerPath?.consolidationDecision).toMatch(/until route analytics and user-flow validation/i);
    expect(careerPath?.behaviorPreservation).toMatch(/Preserve AI generation call/i);
  });

  it('surfaces secondary entry points for route-level UI review', () => {
    const dashboardEntryPoints = getSecondaryFeatureEntryPointsForRoute('dashboard');
    const dashboardFeatureIds = dashboardEntryPoints.map(({ feature }) => feature.id);

    expect(dashboardFeatureIds).toEqual(expect.arrayContaining([
      'jobs-workspace',
      'job-posting',
      'candidate-review',
      'learning',
      'challenges',
      'messaging',
    ]));
  });
});
