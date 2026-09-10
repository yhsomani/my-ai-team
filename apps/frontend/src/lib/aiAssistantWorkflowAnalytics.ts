import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';

export type AIAssistantWorkflowAnalyticsAction =
  | 'ai_chat_clear_review_opened'
  | 'ai_chat_clear_cancelled'
  | 'ai_chat_cleared';

interface AIAssistantWorkflowAnalyticsInput {
  userId?: string | null;
  action: AIAssistantWorkflowAnalyticsAction;
  sessionId?: string | null;
  messageCount?: number;
  userMessageCount?: number;
  assistantMessageCount?: number;
  draftSuggestionCount?: number;
  savedSuggestionCount?: number;
  dismissedSuggestionCount?: number;
  hasPendingPrompt?: boolean;
}

const getEventName = (action: AIAssistantWorkflowAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'ai_chat_cleared':
      return 'task_completed';
    case 'ai_chat_clear_cancelled':
      return 'task_abandoned';
    case 'ai_chat_clear_review_opened':
    default:
      return 'task_started';
  }
};

const getCountBand = (count?: number) => {
  if (count === undefined || !Number.isFinite(count)) return undefined;
  if (count <= 0) return 'none';
  if (count <= 5) return 'low';
  if (count <= 20) return 'medium';
  return 'high';
};

export const recordAIAssistantWorkflowAnalytics = ({
  userId,
  action,
  sessionId,
  messageCount,
  userMessageCount,
  assistantMessageCount,
  draftSuggestionCount,
  savedSuggestionCount,
  dismissedSuggestionCount,
  hasPendingPrompt,
}: AIAssistantWorkflowAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'ai',
    eventName: getEventName(action),
    source: 'ai_assistant_chat',
    objectType: 'ai_chat_session',
    objectId: sessionId || undefined,
    metadata: {
      action,
      sessionId,
      messageCountBand: getCountBand(messageCount),
      userMessageCountBand: getCountBand(userMessageCount),
      assistantMessageCountBand: getCountBand(assistantMessageCount),
      draftSuggestionCountBand: getCountBand(draftSuggestionCount),
      savedSuggestionCountBand: getCountBand(savedSuggestionCount),
      dismissedSuggestionCountBand: getCountBand(dismissedSuggestionCount),
      hasPendingPrompt,
      userControl: 'explicit',
      mutationScope: 'ai_chat_history',
    },
  });
};
