import { beforeEach, describe, expect, it, vi } from 'vitest';
import { automationSuggestionAudit } from './automationSuggestionAudit';
import { recordAiWorkflowPrefillDecision } from './aiWorkflowPrefillAudit';
import { productAnalytics } from './productAnalytics';

vi.mock('./automationSuggestionAudit', () => ({
  automationSuggestionAudit: {
    recordEvent: vi.fn(),
  },
}));

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('recordAiWorkflowPrefillDecision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records used decisions to analytics and automation audit', () => {
    recordAiWorkflowPrefillDecision({
      userId: 'user-1',
      suggestionId: 'suggestion-1',
      workflow: 'applications',
      decision: 'used',
      sourceLabel: 'Assistant',
      metadata: {
        fieldCount: 2,
        jobId: 'job-1',
      },
      occurredAt: '2026-06-01T10:00:00.000Z',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'applications',
      eventName: 'workflow_prefill_used',
      source: 'ai_workflow_prefill',
      objectType: 'automation_suggestion',
      objectId: 'suggestion-1',
      metadata: {
        workflow: 'applications',
        decision: 'used',
        sourceLabel: 'Assistant',
        fieldCount: 2,
        jobId: 'job-1',
      },
      occurredAt: '2026-06-01T10:00:00.000Z',
    });
    expect(automationSuggestionAudit.recordEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      suggestionId: 'suggestion-1',
      eventType: 'workflow_prefill_used',
      source: 'ai_workflow_prefill',
      metadata: {
        workflow: 'applications',
        decision: 'used',
        sourceLabel: 'Assistant',
        fieldCount: 2,
        jobId: 'job-1',
      },
      occurredAt: '2026-06-01T10:00:00.000Z',
    });
  });

  it('records rejected learning decisions with LMS analytics area', () => {
    recordAiWorkflowPrefillDecision({
      userId: 'user-1',
      suggestionId: 'suggestion-2',
      workflow: 'learning',
      decision: 'rejected',
      metadata: {
        decisionReason: 'dismiss',
      },
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      area: 'lms',
      eventName: 'workflow_prefill_rejected',
      objectId: 'suggestion-2',
      metadata: expect.objectContaining({
        workflow: 'learning',
        decision: 'rejected',
        decisionReason: 'dismiss',
      }),
    }));
    expect(automationSuggestionAudit.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
      suggestionId: 'suggestion-2',
      eventType: 'workflow_prefill_rejected',
    }));
  });

  it('skips automation audit when no suggestion ID is available', () => {
    recordAiWorkflowPrefillDecision({
      workflow: 'profile',
      decision: 'used',
      metadata: {
        fieldCount: 1,
      },
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      area: 'profile',
      objectType: 'ai_workflow_prefill',
      objectId: undefined,
      eventName: 'workflow_prefill_used',
    }));
    expect(automationSuggestionAudit.recordEvent).not.toHaveBeenCalled();
  });
});
