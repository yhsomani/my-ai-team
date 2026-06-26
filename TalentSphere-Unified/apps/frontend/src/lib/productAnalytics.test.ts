import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from './supabaseClient';
import {
  buildProductAnalyticsEvent,
  productAnalytics,
  productAnalyticsEventTaxonomy,
} from './productAnalytics';

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('productAnalytics', () => {
  let queryBuilder: any;
  let localStorageData: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageData = {};
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => localStorageData[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageData[key] = value;
        }),
      },
    });

    queryBuilder = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'event-1',
          user_id: 'user-1',
          area: 'ai',
          event_name: 'automation_suggestion_saved',
          source: 'ai_review_queue',
          object_type: 'automation_suggestion',
          object_id: 'suggestion-1',
          metadata: { workflow: 'resume' },
          occurred_at: '2026-06-01T10:00:00.000Z',
        },
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue(queryBuilder);
  });

  it('defines the expected automation and workflow event taxonomy', () => {
    expect(productAnalyticsEventTaxonomy.automation_suggestion_generated.description).toContain('recommendation');
    expect(productAnalyticsEventTaxonomy.automation_suggestion_saved.label).toBe('Automation Suggestion Saved');
    expect(productAnalyticsEventTaxonomy.automation_suggestion_dismissed.label).toBe('Automation Suggestion Dismissed');
    expect(productAnalyticsEventTaxonomy.automation_handoff_opened.description).toContain('destination workflow');
    expect(productAnalyticsEventTaxonomy.preference_updated.description).toContain('preference');
    expect(productAnalyticsEventTaxonomy.task_failed.description).toContain('failed');
  });

  it('builds normalized analytics event records', () => {
    const event = buildProductAnalyticsEvent({
      userId: ' user-1 ',
      area: 'ai',
      eventName: 'automation_suggestion_generated',
      source: ' ai_assistant ',
      objectType: ' automation_suggestion ',
      objectId: ' suggestion-1 ',
      metadata: { workflow: 'jobs' },
      occurredAt: '2026-06-01T10:00:00.000Z',
    });

    expect(event).toMatchObject({
      userId: 'user-1',
      area: 'ai',
      eventName: 'automation_suggestion_generated',
      source: 'ai_assistant',
      objectType: 'automation_suggestion',
      objectId: 'suggestion-1',
      metadata: { workflow: 'jobs' },
      occurredAt: '2026-06-01T10:00:00.000Z',
    });
    expect(event.id).toEqual(expect.any(String));
  });

  it('persists analytics events to Supabase when available', async () => {
    const result = await productAnalytics.trackEvent({
      userId: 'user-1',
      area: 'ai',
      eventName: 'automation_suggestion_saved',
      source: 'ai_review_queue',
      objectType: 'automation_suggestion',
      objectId: 'suggestion-1',
      metadata: { workflow: 'resume' },
      occurredAt: '2026-06-01T10:00:00.000Z',
    });

    expect(supabase.from).toHaveBeenCalledWith('product_analytics_events');
    expect(queryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      area: 'ai',
      event_name: 'automation_suggestion_saved',
      source: 'ai_review_queue',
      object_type: 'automation_suggestion',
      object_id: 'suggestion-1',
      metadata: { workflow: 'resume' },
    }));
    expect(result.persistedTo).toBe('server');
    expect(result.event).toMatchObject({
      id: 'event-1',
      userId: 'user-1',
      eventName: 'automation_suggestion_saved',
    });
  });

  it('stores analytics events locally when Supabase is unavailable', async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error('Supabase unavailable'),
    });

    const result = await productAnalytics.trackEvent({
      userId: 'user-1',
      area: 'ai',
      eventName: 'automation_handoff_opened',
      source: 'ai_review_queue',
      objectType: 'automation_suggestion',
      objectId: 'suggestion-1',
      metadata: { workflow: 'resume', path: '/resume' },
    });

    expect(result.persistedTo).toBe('local');
    const events = productAnalytics.getLocalFallbackEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      userId: 'user-1',
      area: 'ai',
      eventName: 'automation_handoff_opened',
      objectId: 'suggestion-1',
      metadata: { workflow: 'resume', path: '/resume' },
    });
  });

  it('keeps local analytics fallback bounded to the latest 100 events', async () => {
    queryBuilder.single.mockResolvedValue({
      data: null,
      error: new Error('Supabase unavailable'),
    });

    for (let index = 0; index < 105; index += 1) {
      await productAnalytics.trackEvent({
        area: 'ai',
        eventName: 'automation_suggestion_generated',
        source: 'test',
        objectId: `suggestion-${index}`,
      });
    }

    const events = productAnalytics.getLocalFallbackEvents();
    expect(events).toHaveLength(100);
    expect(events[0].objectId).toBe('suggestion-104');
    expect(events.some(event => event.objectId === 'suggestion-0')).toBe(false);
  });
});
