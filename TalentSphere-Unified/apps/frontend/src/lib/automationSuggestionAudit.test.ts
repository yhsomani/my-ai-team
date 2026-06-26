import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from './supabaseClient';
import {
  automationSuggestionAudit,
  buildAutomationSuggestionAuditEvent,
} from './automationSuggestionAudit';

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('automationSuggestionAudit', () => {
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
          id: 'audit-1',
          user_id: 'user-1',
          suggestion_id: 'suggestion-1',
          event_type: 'review_status_changed',
          previous_review_status: 'draft',
          next_review_status: 'saved',
          source: 'ai_review_queue',
          metadata: { bulk: false },
          occurred_at: '2026-06-01T10:00:00.000Z',
        },
        error: null,
      }),
    };

    (supabase.from as any).mockReturnValue(queryBuilder);
  });

  it('builds normalized audit event records', () => {
    const event = buildAutomationSuggestionAuditEvent({
      userId: ' user-1 ',
      suggestionId: ' suggestion-1 ',
      eventType: 'workflow_prefill_used',
      previousReviewStatus: 'draft',
      nextReviewStatus: 'dismissed',
      source: ' ai_workflow_prefill ',
      metadata: { bulk: true },
      occurredAt: '2026-06-01T10:00:00.000Z',
    });

    expect(event).toMatchObject({
      userId: 'user-1',
      suggestionId: 'suggestion-1',
      eventType: 'workflow_prefill_used',
      previousReviewStatus: 'draft',
      nextReviewStatus: 'dismissed',
      source: 'ai_workflow_prefill',
      metadata: { bulk: true },
      occurredAt: '2026-06-01T10:00:00.000Z',
    });
    expect(event.id).toEqual(expect.any(String));
  });

  it('persists audit events to Supabase when available', async () => {
    const result = await automationSuggestionAudit.recordEvent({
      userId: 'user-1',
      suggestionId: 'suggestion-1',
      eventType: 'review_status_changed',
      previousReviewStatus: 'draft',
      nextReviewStatus: 'saved',
      source: 'ai_review_queue',
      metadata: { bulk: false },
      occurredAt: '2026-06-01T10:00:00.000Z',
    });

    expect(supabase.from).toHaveBeenCalledWith('automation_suggestion_audit_events');
    expect(queryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      suggestion_id: 'suggestion-1',
      event_type: 'review_status_changed',
      previous_review_status: 'draft',
      next_review_status: 'saved',
      source: 'ai_review_queue',
      metadata: { bulk: false },
    }));
    expect(result.persistedTo).toBe('server');
    expect(result.event).toMatchObject({
      id: 'audit-1',
      suggestionId: 'suggestion-1',
      nextReviewStatus: 'saved',
    });
  });

  it('stores audit events locally when Supabase is unavailable', async () => {
    queryBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error('Supabase unavailable'),
    });

    const result = await automationSuggestionAudit.recordEvent({
      userId: 'user-1',
      suggestionId: 'suggestion-1',
      eventType: 'review_status_changed',
      previousReviewStatus: 'draft',
      nextReviewStatus: 'dismissed',
      source: 'ai_review_queue',
      metadata: { reviewedCount: 1 },
    });

    expect(result.persistedTo).toBe('local');
    const events = automationSuggestionAudit.getLocalFallbackEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      userId: 'user-1',
      suggestionId: 'suggestion-1',
      eventType: 'review_status_changed',
      previousReviewStatus: 'draft',
      nextReviewStatus: 'dismissed',
      metadata: { reviewedCount: 1 },
    });
  });

  it('keeps local audit fallback bounded to the latest 100 events', async () => {
    queryBuilder.single.mockResolvedValue({
      data: null,
      error: new Error('Supabase unavailable'),
    });

    for (let index = 0; index < 105; index += 1) {
      await automationSuggestionAudit.recordEvent({
        userId: 'user-1',
        suggestionId: `suggestion-${index}`,
        eventType: 'review_status_changed',
        previousReviewStatus: 'draft',
        nextReviewStatus: 'saved',
        source: 'test',
      });
    }

    const events = automationSuggestionAudit.getLocalFallbackEvents();
    expect(events).toHaveLength(100);
    expect(events[0].suggestionId).toBe('suggestion-104');
    expect(events.some(event => event.suggestionId === 'suggestion-0')).toBe(false);
  });
});
