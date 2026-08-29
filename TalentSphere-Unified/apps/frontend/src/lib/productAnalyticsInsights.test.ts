import { describe, expect, it } from 'vitest';

import type { ProductAnalyticsEventRecord } from './productAnalytics';
import { summarizeProductAnalyticsEvents } from './productAnalyticsInsights';

const createEvent = (
  overrides: Partial<ProductAnalyticsEventRecord>
): ProductAnalyticsEventRecord => ({
  id: overrides.id || `event-${Math.random()}`,
  userId: overrides.userId,
  area: overrides.area || 'ai',
  eventName: overrides.eventName || 'task_started',
  source: overrides.source || 'test',
  objectType: overrides.objectType,
  objectId: overrides.objectId,
  metadata: overrides.metadata || {},
  occurredAt: overrides.occurredAt || '2026-06-26T10:00:00.000Z',
});

describe('productAnalyticsInsights', () => {
  it('summarizes product analytics counts, rates, and top areas', () => {
    const summary = summarizeProductAnalyticsEvents([
      createEvent({
        id: 'event-1',
        userId: 'user-1',
        area: 'ai',
        eventName: 'automation_suggestion_generated',
        occurredAt: '2026-06-26T10:00:00.000Z',
      }),
      createEvent({
        id: 'event-2',
        userId: 'user-1',
        area: 'ai',
        eventName: 'automation_suggestion_saved',
        occurredAt: '2026-06-26T10:01:00.000Z',
      }),
      createEvent({
        id: 'event-3',
        userId: 'user-2',
        area: 'resume',
        eventName: 'workflow_prefill_rejected',
        occurredAt: '2026-06-26T10:02:00.000Z',
      }),
      createEvent({
        id: 'event-4',
        userId: 'user-2',
        area: 'resume',
        eventName: 'task_failed',
        occurredAt: '2026-06-26T10:03:00.000Z',
      }),
    ], 'server');

    expect(summary).toMatchObject({
      source: 'server',
      eventCount: 4,
      uniqueAreaCount: 2,
      uniqueUserCount: 2,
      latestOccurredAt: '2026-06-26T10:03:00.000Z',
      automationGeneratedCount: 1,
      automationAcceptedCount: 1,
      automationDismissedCount: 1,
      prefillRejectedCount: 1,
      failureCount: 1,
      acceptanceRate: 50,
      rejectionRate: 50,
      failureRate: 25,
    });
    expect(summary.topAreas[0]).toMatchObject({ area: 'ai', eventCount: 2 });
    expect(summary.topEvents.some(event => event.eventName === 'task_failed')).toBe(true);
    expect(summary.frictionSignals.map(signal => signal.label)).toContain('High Failure Share');
    expect(summary.improvementOpportunities[0]).toMatchObject({
      id: 'stabilize-high-friction-workflows',
      priority: 'P1',
      area: 'resume',
    });
    expect(summary.improvementOpportunities.map(opportunity => opportunity.id)).toContain('tune-automation-suggestion-quality');
  });

  it('returns an empty-source summary when no events are available', () => {
    const summary = summarizeProductAnalyticsEvents([], 'local');

    expect(summary).toMatchObject({
      source: 'empty',
      eventCount: 0,
      uniqueAreaCount: 0,
      uniqueUserCount: 0,
      acceptanceRate: null,
      rejectionRate: null,
      failureRate: null,
    });
    expect(summary.frictionSignals).toEqual([
      expect.objectContaining({
        label: 'No Analytics Events',
        severity: 'info',
      }),
    ]);
    expect(summary.improvementOpportunities).toEqual([
      expect.objectContaining({
        id: 'analytics-instrumentation-coverage',
        priority: 'P2',
      }),
    ]);
  });

  it('prioritizes high failure concentration as a critical improvement opportunity', () => {
    const summary = summarizeProductAnalyticsEvents([
      createEvent({ id: 'event-1', area: 'messaging', eventName: 'task_failed' }),
      createEvent({ id: 'event-2', area: 'messaging', eventName: 'task_failed' }),
      createEvent({ id: 'event-3', area: 'messaging', eventName: 'degraded_state_shown' }),
      createEvent({ id: 'event-4', area: 'messaging', eventName: 'task_completed' }),
    ], 'server');

    expect(summary.failureRate).toBe(75);
    expect(summary.improvementOpportunities[0]).toMatchObject({
      id: 'stabilize-high-friction-workflows',
      priority: 'P0',
      area: 'messaging',
    });
    expect(summary.improvementOpportunities[0].userControl).toContain('does not');
  });

  it('keeps rendered insights privacy-bounded to aggregate labels and counts', () => {
    const summary = summarizeProductAnalyticsEvents([
      createEvent({
        id: 'event-private',
        userId: 'user-secret',
        area: 'applications',
        eventName: 'task_failed',
        objectId: 'private-application-id',
        metadata: {
          rawCoverLetter: 'private cover letter',
          errorMessage: 'private provider error',
        },
      }),
    ], 'server');

    const renderedSummary = JSON.stringify({
      topAreas: summary.topAreas,
      topEvents: summary.topEvents,
      frictionSignals: summary.frictionSignals,
      improvementOpportunities: summary.improvementOpportunities,
    });

    expect(renderedSummary).toContain('applications');
    expect(renderedSummary).not.toContain('user-secret');
    expect(renderedSummary).not.toContain('private-application-id');
    expect(renderedSummary).not.toContain('private cover letter');
    expect(renderedSummary).not.toContain('private provider error');
  });
});
