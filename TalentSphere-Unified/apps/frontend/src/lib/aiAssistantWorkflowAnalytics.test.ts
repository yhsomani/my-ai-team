import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordAIAssistantWorkflowAnalytics } from './aiAssistantWorkflowAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('aiAssistantWorkflowAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records chat clear review decisions without chat content', () => {
    recordAIAssistantWorkflowAnalytics({
      userId: 'user-1',
      action: 'ai_chat_clear_review_opened',
      sessionId: 'session-1',
      messageCount: 12,
      userMessageCount: 5,
      assistantMessageCount: 7,
      draftSuggestionCount: 3,
      savedSuggestionCount: 1,
      dismissedSuggestionCount: 2,
      hasPendingPrompt: true,
    });
    recordAIAssistantWorkflowAnalytics({
      userId: 'user-1',
      action: 'ai_chat_clear_cancelled',
      sessionId: 'session-1',
      messageCount: 12,
      hasPendingPrompt: true,
    });
    recordAIAssistantWorkflowAnalytics({
      userId: 'user-1',
      action: 'ai_chat_cleared',
      sessionId: 'session-1',
      messageCount: 12,
      userMessageCount: 5,
      assistantMessageCount: 7,
      draftSuggestionCount: 3,
      hasPendingPrompt: true,
    });

    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      area: 'ai',
      eventName: 'task_started',
      source: 'ai_assistant_chat',
      objectType: 'ai_chat_session',
      objectId: 'session-1',
      metadata: expect.objectContaining({
        action: 'ai_chat_clear_review_opened',
        sessionId: 'session-1',
        messageCountBand: 'medium',
        userMessageCountBand: 'low',
        assistantMessageCountBand: 'medium',
        draftSuggestionCountBand: 'low',
        savedSuggestionCountBand: 'low',
        dismissedSuggestionCountBand: 'low',
        hasPendingPrompt: true,
        userControl: 'explicit',
        mutationScope: 'ai_chat_history',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      eventName: 'task_abandoned',
      metadata: expect.objectContaining({
        action: 'ai_chat_clear_cancelled',
        messageCountBand: 'medium',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(3, expect.objectContaining({
      eventName: 'task_completed',
      metadata: expect.objectContaining({
        action: 'ai_chat_cleared',
        messageCountBand: 'medium',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        content: expect.anything(),
        messages: expect.anything(),
        prompt: expect.anything(),
        recommendationText: expect.anything(),
      }),
    }));
  });

  it('normalizes empty counts for a no-op clear context', () => {
    recordAIAssistantWorkflowAnalytics({
      action: 'ai_chat_clear_review_opened',
      sessionId: 'session-2',
      messageCount: 0,
      userMessageCount: 0,
      assistantMessageCount: 0,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        action: 'ai_chat_clear_review_opened',
        messageCountBand: 'none',
        userMessageCountBand: 'none',
        assistantMessageCountBand: 'none',
      }),
    }));
  });
});
