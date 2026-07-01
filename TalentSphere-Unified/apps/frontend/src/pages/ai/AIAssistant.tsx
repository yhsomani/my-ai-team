import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User, Sparkles, Loader2, Trash2, CheckCircle2, X, ClipboardList, ArrowRight } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { aiService } from '../../services/aiService';
import type { AIChatMessageRecord, AIReviewStatus } from '../../services/aiService';
import {
  aiHeuristicProvenance,
  aiUnavailableProvenance,
  getAIProvenanceSourceStatus,
  normalizeAIProvenance,
  type AIProvenanceInput,
  type AIProvenanceMode,
} from '../../lib/aiProvenance';
import { buildAISuggestionReviewQueue } from '../../lib/aiSuggestionReviewQueue';
import type { AISuggestionReviewQueueItem } from '../../lib/aiSuggestionReviewQueue';
import { automationSuggestionAudit } from '../../lib/automationSuggestionAudit';
import { productAnalytics } from '../../lib/productAnalytics';
import type { ProductAnalyticsEventName } from '../../lib/productAnalytics';
import { recordAIAssistantWorkflowAnalytics } from '../../lib/aiAssistantWorkflowAnalytics';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { SourceStatusBadge } from '../../components/shared/SourceStatusBadge';
import { useAppSelector } from '../../store/hooks';
import { useToast } from '../../components/shared/Toast';

interface Message extends AIChatMessageRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  sourceLabel?: string;
  sourceDetail?: string;
  provenanceMode?: AIProvenanceMode;
  controlNote?: string;
  reviewStatus?: AIReviewStatus;
  reviewedAt?: string;
}

interface StoredChat {
  sessionId?: string;
  messages: Message[];
  savedAt: string;
}

interface PromptSuggestion {
  label: string;
  prompt: string;
}

type ReviewedAIStatus = Exclude<AIReviewStatus, 'draft'>;
type ChatPersistenceState = 'local' | 'syncing' | 'account';
const decorativeIconProps = { 'aria-hidden': true, focusable: 'false' as const };

const createMessageId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const createWelcomeMessage = (): Message => ({
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your AI career assistant. I can help you with resume reviews, interview prep, job recommendations, and career advice. How can I help you today?",
  createdAt: new Date().toISOString(),
});

const createAssistantDraftMessage = (content: string, provenanceInput: AIProvenanceInput = aiHeuristicProvenance): Message => {
  const provenance = normalizeAIProvenance(provenanceInput);

  return {
    id: createMessageId(),
    role: 'assistant',
    content,
    createdAt: new Date().toISOString(),
    sourceLabel: provenance.sourceLabel,
    sourceDetail: provenance.sourceDetail,
    provenanceMode: provenance.provenanceMode,
    controlNote: provenance.controlNote,
    reviewStatus: 'draft',
  };
};

const getStoredChat = (storageKey: string): StoredChat | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { messages: parsed, savedAt: new Date().toISOString() };
    }
    if (Array.isArray(parsed.messages)) {
      return {
        sessionId: typeof parsed.sessionId === 'string' ? parsed.sessionId : undefined,
        messages: parsed.messages,
        savedAt: parsed.savedAt || new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('Failed to load AI chat history:', error);
  }
  return null;
};

const saveStoredChat = (storageKey: string, messages: Message[], sessionId: string) => {
  if (typeof window === 'undefined') return null;
  const savedAt = new Date().toISOString();
  window.localStorage.setItem(storageKey, JSON.stringify({ sessionId, messages, savedAt }));
  return savedAt;
};

const formatSavedTime = (value: string | null) => {
  if (!value) return 'Not saved yet';
  return `Saved ${new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const getChatPersistenceLabel = (state: ChatPersistenceState, hasAccount: boolean) => {
  if (!hasAccount) return 'Browser local';
  if (state === 'account') return 'Account synced';
  if (state === 'syncing') return 'Syncing account';
  return 'Saved locally';
};

const formatReviewedTime = (value?: string) => {
  if (!value) return null;
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getAIMessageLabel = (message: Message, index: number) => {
  if (message.role === 'user') return `You message ${index + 1}.`;
  if (message.id === 'welcome') return `AI assistant message ${index + 1}. Welcome message.`;

  const status = message.reviewStatus === 'saved'
    ? 'Saved recommendation'
    : message.reviewStatus === 'dismissed'
      ? 'Dismissed recommendation'
      : 'Draft recommendation';
  return `AI assistant message ${index + 1}. ${status}.`;
};

const getAIReviewQueueItemLabel = (item: AISuggestionReviewQueueItem) => (
  `Draft AI recommendation for ${item.label}. Source: ${item.sourceLabel}.`
);

const AIAssistant: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const storageKey = useMemo(() => `talentsphere.ai.chat.${user?.id || 'guest'}`, [user?.id]);
  const [sessionId, setSessionId] = useState(createMessageId);
  const [messages, setMessages] = useState<Message[]>([createWelcomeMessage()]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [chatPersistenceState, setChatPersistenceState] = useState<ChatPersistenceState>('local');
  const [pendingSuggestion, setPendingSuggestion] = useState<PromptSuggestion | null>(null);
  const [isClearChatReviewOpen, setIsClearChatReviewOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionSyncTimerRef = useRef<number | null>(null);
  const sessionSyncWarningRef = useRef(false);
  const suggestionSyncWarningRef = useRef(false);
  const suggestionReviewQueue = useMemo(() => buildAISuggestionReviewQueue(messages), [messages]);
  const chatPersistenceLabel = useMemo(
    () => getChatPersistenceLabel(chatPersistenceState, Boolean(user?.id)),
    [chatPersistenceState, user?.id]
  );

  useEffect(() => {
    setLoadedStorageKey(null);
    const storedChat = getStoredChat(storageKey);
    const localSessionId = storedChat?.sessionId || createMessageId();
    setSessionId(localSessionId);
    setMessages(storedChat?.messages?.length ? storedChat.messages : [createWelcomeMessage()]);
    setLastSavedAt(storedChat?.savedAt || null);
    setChatPersistenceState('local');
    setPendingSuggestion(null);
    setIsClearChatReviewOpen(false);
    setInput('');
    setLoadedStorageKey(storageKey);

    if (!user?.id) return;

    let isActive = true;
    const hydrateAccountSession = async () => {
      try {
        const serverSession = await aiService.getLatestSession(user.id);
        if (!isActive) return;

        if (!serverSession) {
          if (storedChat?.messages?.length) {
            void aiService.saveSession(user.id, {
              id: localSessionId,
              messages: storedChat.messages,
              lastSavedAt: storedChat.savedAt,
            })
              .then(() => {
                if (isActive) setChatPersistenceState('account');
              })
              .catch(error => {
                console.warn('Unable to backfill local AI session:', error);
                if (isActive) setChatPersistenceState('local');
              });
          }
          return;
        }

        const localSavedAt = storedChat?.savedAt ? new Date(storedChat.savedAt).getTime() : 0;
        const serverSavedAt = new Date(serverSession.lastSavedAt || serverSession.updatedAt).getTime();
        if (serverSession.messages.length > 0 && serverSavedAt > localSavedAt) {
          setSessionId(serverSession.id);
          setMessages(serverSession.messages as Message[]);
          setLastSavedAt(serverSession.lastSavedAt);
          setChatPersistenceState('account');
          return;
        }

        if (storedChat?.messages?.length && serverSession.id !== localSessionId) {
          void aiService.saveSession(user.id, {
            id: localSessionId,
            messages: storedChat.messages,
            lastSavedAt: storedChat.savedAt,
          })
            .then(() => {
              if (isActive) setChatPersistenceState('account');
            })
            .catch(error => {
              console.warn('Unable to backfill local AI session:', error);
              if (isActive) setChatPersistenceState('local');
            });
        }
      } catch (error) {
        console.warn('Using local AI chat history fallback:', error);
        if (isActive) setChatPersistenceState('local');
      }
    };

    void hydrateAccountSession();

    return () => {
      isActive = false;
    };
  }, [storageKey, user?.id]);

  useEffect(() => {
    if (loadedStorageKey !== storageKey) return;
    try {
      const savedAt = saveStoredChat(storageKey, messages, sessionId);
      setLastSavedAt(savedAt);
      setChatPersistenceState('local');

      if (user?.id && savedAt) {
        if (sessionSyncTimerRef.current) {
          window.clearTimeout(sessionSyncTimerRef.current);
        }
        setChatPersistenceState('syncing');

        sessionSyncTimerRef.current = window.setTimeout(() => {
          void aiService.saveSession(user.id, {
            id: sessionId,
            messages,
            lastSavedAt: savedAt,
          }).then(() => {
            setChatPersistenceState('account');
            sessionSyncWarningRef.current = false;
          }).catch(error => {
            console.warn('AI session stored locally only:', error);
            setChatPersistenceState('local');
            if (!sessionSyncWarningRef.current) {
              sessionSyncWarningRef.current = true;
              addToast({ type: 'warning', title: 'AI history saved locally', message: 'Account AI history sync is unavailable.' });
            }
          });
        }, 800);
      }
    } catch (error) {
      console.error('Failed to save AI chat history:', error);
    }
  }, [addToast, loadedStorageKey, messages, sessionId, storageKey, user?.id]);

  useEffect(() => () => {
    if (sessionSyncTimerRef.current) {
      window.clearTimeout(sessionSyncTimerRef.current);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const trackAISuggestionEvent = (
    eventName: ProductAnalyticsEventName,
    message: Pick<Message, 'id' | 'reviewStatus' | 'sourceLabel'>,
    metadata?: Record<string, unknown>
  ) => {
    void productAnalytics.trackEvent({
      userId: user?.id,
      area: 'ai',
      eventName,
      source: 'ai_review_queue',
      objectType: 'automation_suggestion',
      objectId: message.id,
      metadata: {
        sessionId,
        reviewStatus: message.reviewStatus || 'draft',
        sourceLabel: message.sourceLabel || aiHeuristicProvenance.sourceLabel,
        ...metadata,
      },
    });
  };

  const getChatClearAnalyticsContext = () => ({
    sessionId,
    messageCount: Math.max(messages.length - 1, 0),
    userMessageCount: messages.filter(message => message.role === 'user').length,
    assistantMessageCount: messages.filter(message => message.role === 'assistant' && message.id !== 'welcome').length,
    draftSuggestionCount: messages.filter(message => message.role === 'assistant' && message.reviewStatus === 'draft').length,
    savedSuggestionCount: messages.filter(message => message.role === 'assistant' && message.reviewStatus === 'saved').length,
    dismissedSuggestionCount: messages.filter(message => message.role === 'assistant' && message.reviewStatus === 'dismissed').length,
    hasPendingPrompt: Boolean(input.trim() || pendingSuggestion),
  });

  const recordChatClearAction = (action: Parameters<typeof recordAIAssistantWorkflowAnalytics>[0]['action']) => {
    recordAIAssistantWorkflowAnalytics({
      userId: user?.id,
      action,
      ...getChatClearAnalyticsContext(),
    });
  };

  const syncAutomationSuggestion = async (message: Message, prompt?: string) => {
    if (!user?.id || message.role !== 'assistant' || message.id === 'welcome') return;

    try {
      await aiService.saveAutomationSuggestion(user.id, {
        id: message.id,
        sessionId,
        prompt,
        content: message.content,
        sourceLabel: message.sourceLabel,
        sourceDetail: message.sourceDetail,
        reviewStatus: message.reviewStatus || 'draft',
        reviewedAt: message.reviewedAt,
      });
      suggestionSyncWarningRef.current = false;
    } catch (error) {
      console.warn('AI suggestion stored locally only:', error);
      if (!suggestionSyncWarningRef.current) {
        suggestionSyncWarningRef.current = true;
        addToast({ type: 'warning', title: 'AI review saved locally', message: 'Account AI suggestion sync is unavailable.' });
      }
    }
  };

  const handleSend = async (messageOverride?: string) => {
    const messageText = (messageOverride ?? input).trim();
    if (!messageText || isTyping) return;
    const userMsg: Message = {
      id: createMessageId(),
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingSuggestion(null);
    setIsClearChatReviewOpen(false);
    setIsTyping(true);

    try {
      const response = await aiService.getChatResponse(messageText);
      const aiMsg = createAssistantDraftMessage(
        response.message || "I'm sorry, I couldn't process that request.",
        response
      );
      setMessages(prev => [...prev, aiMsg]);
      void syncAutomationSuggestion(aiMsg, messageText);
      trackAISuggestionEvent('automation_suggestion_generated', aiMsg, {
        promptLength: messageText.length,
        generationState: 'success',
      });
    } catch (error) {
      console.error("AI chat error:", error);
      const errorMsg = createAssistantDraftMessage(
        "Sorry, I'm having trouble connecting to the AI service right now.",
        aiUnavailableProvenance
      );
      setMessages(prev => [...prev, errorMsg]);
      void syncAutomationSuggestion(errorMsg, messageText);
      trackAISuggestionEvent('automation_suggestion_generated', errorMsg, {
        promptLength: messageText.length,
        generationState: 'service_error',
      });
      void productAnalytics.trackEvent({
        userId: user?.id,
        area: 'ai',
        eventName: 'task_failed',
        source: 'ai_assistant_chat',
        objectType: 'automation_suggestion',
        objectId: errorMsg.id,
        metadata: {
          sessionId,
          promptLength: messageText.length,
          reason: 'chat_response_failed',
        },
      });
    } finally {
      setIsTyping(false);
    }
  };

  const syncReviewedSuggestion = async (
    messageToReview: Message,
    reviewStatus: ReviewedAIStatus,
    reviewedAt: string
  ) => {
    if (!user?.id) return;

    try {
      await aiService.updateAutomationSuggestionStatus(user.id, messageToReview.id, reviewStatus, reviewedAt);
      suggestionSyncWarningRef.current = false;
      return;
    } catch (updateError) {
      console.warn('AI suggestion status update unavailable; attempting review upsert:', updateError);
    }

    try {
      await aiService.saveAutomationSuggestion(user.id, {
        id: messageToReview.id,
        sessionId,
        prompt: undefined,
        content: messageToReview.content,
        sourceLabel: messageToReview.sourceLabel,
        sourceDetail: messageToReview.sourceDetail,
        reviewStatus,
        reviewedAt,
      });
      suggestionSyncWarningRef.current = false;
    } catch (error) {
      console.warn('AI suggestion review stored locally only:', error);
      if (!suggestionSyncWarningRef.current) {
        suggestionSyncWarningRef.current = true;
        addToast({ type: 'warning', title: 'AI review saved locally', message: 'Account AI suggestion sync is unavailable.' });
      }
    }
  };

  const handleReviewStatus = (
    messageIds: string | string[],
    reviewStatus: ReviewedAIStatus
  ) => {
    const ids = new Set(Array.isArray(messageIds) ? messageIds : [messageIds]);
    const messagesToReview = messages.filter(message => ids.has(message.id));
    if (messagesToReview.length === 0) return;

    const reviewedAt = new Date().toISOString();
    setMessages(prev => prev.map(message => (
      ids.has(message.id)
        ? {
            ...message,
            reviewStatus,
            reviewedAt,
          }
        : message
    )));

    const isBulkReview = messagesToReview.length > 1;

    messagesToReview.forEach(messageToReview => {
      void syncReviewedSuggestion(messageToReview, reviewStatus, reviewedAt);
      void automationSuggestionAudit.recordEvent({
        userId: user?.id,
        suggestionId: messageToReview.id,
        eventType: 'review_status_changed',
        previousReviewStatus: messageToReview.reviewStatus || 'draft',
        nextReviewStatus: reviewStatus,
        source: 'ai_review_queue',
        occurredAt: reviewedAt,
        metadata: {
          sessionId,
          bulk: isBulkReview,
          reviewedCount: messagesToReview.length,
          sourceLabel: messageToReview.sourceLabel || aiHeuristicProvenance.sourceLabel,
          provenanceMode: messageToReview.provenanceMode || 'heuristic',
        },
      });
      trackAISuggestionEvent(
        reviewStatus === 'saved' ? 'automation_suggestion_saved' : 'automation_suggestion_dismissed',
        { ...messageToReview, reviewStatus },
        {
          bulk: isBulkReview,
          reviewedCount: messagesToReview.length,
        }
      );
    });

    addToast({
      type: reviewStatus === 'saved' ? 'success' : 'info',
      title: reviewStatus === 'saved'
        ? isBulkReview ? 'Recommendations saved' : 'Recommendation saved'
        : isBulkReview ? 'Recommendations dismissed' : 'Recommendation dismissed',
      message: 'This records your AI review state without changing profile, resume, applications, or settings.',
    });
  };

  const openSuggestionWorkflowHandoff = (item: AISuggestionReviewQueueItem) => {
    trackAISuggestionEvent('automation_handoff_opened', item, {
      workflow: item.key,
      path: item.path,
      label: item.label,
      profileDraftAvailable: item.key === 'profile',
      resumeDraftAvailable: item.key === 'resume',
      applicationDraftAvailable: item.key === 'jobs',
      learningDraftAvailable: item.key === 'learning',
    });
    const aiDraftSource = {
      recommendationId: item.id,
      recommendationText: item.content,
      sourceLabel: item.sourceLabel,
      sourceDetail: item.sourceDetail,
      openedAt: new Date().toISOString(),
    };

    navigate(item.path, item.key === 'profile'
      ? { state: { aiProfileDraft: aiDraftSource } }
      : item.key === 'resume'
        ? { state: { aiResumeDraft: aiDraftSource } }
        : item.key === 'jobs'
          ? { state: { aiApplicationDraft: aiDraftSource } }
          : item.key === 'learning'
            ? { state: { aiLearningDraft: aiDraftSource } }
            : undefined);
  };

  const handleSuggestionClick = (suggestion: PromptSuggestion) => {
    setIsClearChatReviewOpen(false);
    setPendingSuggestion(suggestion);
    setInput(suggestion.prompt);
  };

  const openClearChatReview = () => {
    if (messages.length <= 1) return;
    recordChatClearAction('ai_chat_clear_review_opened');
    setIsClearChatReviewOpen(true);
  };

  const cancelClearChatReview = () => {
    recordChatClearAction('ai_chat_clear_cancelled');
    setIsClearChatReviewOpen(false);
  };

  const confirmClearChat = () => {
    const currentSessionId = sessionId;
    const nextSessionId = createMessageId();
    recordChatClearAction('ai_chat_cleared');
    setSessionId(nextSessionId);
    setMessages([createWelcomeMessage()]);
    setInput('');
    setPendingSuggestion(null);
    setIsClearChatReviewOpen(false);
    if (user?.id) {
      void aiService.deleteSession(user.id, currentSessionId).catch(error => {
        console.warn('AI session delete stored locally only:', error);
      });
    }
    addToast({
      type: 'success',
      title: 'Chat cleared',
      message: 'Your AI assistant history has been reset. No profile, resume, application, or setting was changed.',
    });
  };

  const suggestions: PromptSuggestion[] = [
    {
      label: 'Review my resume',
      prompt: 'Review my resume for clarity, measurable impact, and missing keywords. If you suggest direct resume field edits, return them only in this format: Headline:, Phone:, Location:, Website:, Summary:. Do not change profile or resume data unless I approve and save it.',
    },
    {
      label: 'Prepare for interviews',
      prompt: 'Create an interview prep plan for my next role search with likely questions, practice tasks, and what I should review first.',
    },
    {
      label: 'Draft application note',
      prompt: 'Draft an application note I can review before submitting. Return only fields I can apply in Jobs using this format: Resume URL:, Cover Letter:. Do not submit an application or contact anyone.',
    },
    {
      label: 'Suggest career paths',
      prompt: 'Suggest career paths based on my current skills and goals. Explain why each path fits and what I should validate before choosing one.',
    },
    {
      label: 'Recommend skills to learn',
      prompt: 'Recommend the highest-impact skills I should learn next. Return only learning searches I can review in Learning using this format: Course Search:, Skill:, Certification:. Include short Reason: text only when useful. Do not enroll me in a course or change progress.',
    },
    {
      label: 'Improve my profile',
      prompt: 'Suggest updates for my TalentSphere profile. Return only fields I can review in this format: Headline:, Location:, Bio:. Do not change profile data unless I approve and save it.',
    },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Get personalized career guidance powered by AI."
        badge={<Badge variant="default"><Sparkles {...decorativeIconProps} size={12} className="mr-1" /> Beta</Badge>}
        actions={
          <>
            <SourceStatusBadge
              status={getAIProvenanceSourceStatus(aiHeuristicProvenance.provenanceMode)}
              label={aiHeuristicProvenance.sourceLabel}
              description={aiHeuristicProvenance.sourceDetail}
            />
            <Badge
              variant="outline"
              role="status"
              aria-live="polite"
              title={`${chatPersistenceLabel} - ${formatSavedTime(lastSavedAt)}`}
            >
              <span className="sm:hidden">{chatPersistenceLabel}</span>
              <span className="hidden sm:inline">
                {chatPersistenceLabel} - {formatSavedTime(lastSavedAt)}
              </span>
            </Badge>
            <Button variant="outline" size="sm" onClick={openClearChatReview} disabled={isTyping || messages.length <= 1}>
              <Trash2 {...decorativeIconProps} size={14} />
              Clear
            </Button>
          </>
        }
      />

      {isClearChatReviewOpen && (
        <section
          role="alert"
          className="rounded-lg border border-warning/30 bg-warning-muted p-4"
          aria-labelledby="ai-clear-chat-review-title"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 id="ai-clear-chat-review-title" className="text-sm font-semibold text-warning">
                Clear this AI chat history?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-warning">
                This starts a fresh AI chat and removes the current conversation from this browser. It does not change profile, resume, applications, learning progress, settings, or saved review decisions.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={cancelClearChatReview}>
                Keep Chat
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={confirmClearChat}>
                <Trash2 {...decorativeIconProps} size={14} />
                Clear Chat
              </Button>
            </div>
          </div>
        </section>
      )}

      <section
        aria-labelledby="ai-review-queue-title"
        className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 id="ai-review-queue-title" className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <ClipboardList {...decorativeIconProps} size={16} className="text-accent" />
              AI Review Queue
            </h2>
            <p role="status" aria-live="polite" className="mt-1 text-sm text-[var(--text-secondary)]">
              {suggestionReviewQueue.totalCount === 0
                ? 'Ask for guidance, then review each recommendation before using it in another workflow.'
                : `${suggestionReviewQueue.summary}. Review state is tracked without changing profile, resume, applications, or settings.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={suggestionReviewQueue.draftCount > 0 ? 'warning' : 'success'}>
              {suggestionReviewQueue.draftCount} draft
            </Badge>
            <Badge variant="outline">{suggestionReviewQueue.savedCount} saved</Badge>
            <Badge variant="outline">{suggestionReviewQueue.dismissedCount} dismissed</Badge>
            {suggestionReviewQueue.draftCount > 0 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleReviewStatus(suggestionReviewQueue.draftItems.map(item => item.id), 'saved')}
                >
                  <CheckCircle2 {...decorativeIconProps} size={13} />
                  Save all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReviewStatus(suggestionReviewQueue.draftItems.map(item => item.id), 'dismissed')}
                >
                  <X {...decorativeIconProps} size={13} />
                  Dismiss all
                </Button>
              </>
            )}
          </div>
        </div>

        {suggestionReviewQueue.draftCount > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2" role="list" aria-label="AI draft recommendations">
            {suggestionReviewQueue.draftItems.map(item => (
              <div
                key={item.id}
                role="listitem"
                aria-label={getAIReviewQueueItemLabel(item)}
                className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-accent">{item.label}</p>
                    <p className="mt-1 max-h-16 overflow-hidden text-xs leading-relaxed text-[var(--text-secondary)]">
                      {item.content}
                    </p>
                  </div>
                  <Badge variant="warning" className="w-fit shrink-0">Needs review</Badge>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
                  {item.reason} {item.controlNote}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleReviewStatus(item.id, 'saved')}
                  >
                    <CheckCircle2 {...decorativeIconProps} size={13} />
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReviewStatus(item.id, 'dismissed')}
                  >
                    <X {...decorativeIconProps} size={13} />
                    Dismiss
                  </Button>
                  {item.path !== '/ai' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openSuggestionWorkflowHandoff(item)}
                      aria-label={`${item.actionLabel} for this AI recommendation`}
                    >
                      <ArrowRight {...decorativeIconProps} size={13} />
                      {item.actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : suggestionReviewQueue.totalCount > 0 ? (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Reviewed recommendations remain in the chat history with their saved or dismissed status.
          </p>
        ) : null}
      </section>

      <Card className="min-h-0 flex-1 flex flex-col overflow-hidden">
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
          role="log"
          aria-label="AI conversation"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {messages.map((msg, index) => {
            const messageProvenance = normalizeAIProvenance(msg);

            return (
              <div
                key={msg.id}
                role="article"
                aria-label={getAIMessageLabel(msg, index)}
                className={`flex min-w-0 gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'assistant' ? 'bg-accent/10 text-accent' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
              }`}>
                {msg.role === 'assistant' ? <Bot {...decorativeIconProps} size={16} /> : <User {...decorativeIconProps} size={16} />}
              </div>
              <div className={`max-w-[85%] break-words rounded-lg px-4 py-3 text-sm leading-relaxed sm:max-w-[70%] ${
                msg.role === 'user'
                  ? 'bg-accent text-[var(--accent-foreground)] rounded-tr-sm'
                  : 'bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-tl-sm'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.role === 'assistant' && msg.id !== 'welcome' && (
                  <div className="mt-3 space-y-2 border-t border-[var(--border-default)] pt-2">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 {...decorativeIconProps} size={11} />
                        Draft response
                      </span>
                      <SourceStatusBadge
                        status={getAIProvenanceSourceStatus(messageProvenance.provenanceMode)}
                        label={messageProvenance.sourceLabel}
                        description={messageProvenance.sourceDetail}
                        className="max-w-full"
                      />
                    </div>
                    <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                      {messageProvenance.sourceDetail}
                    </p>
                    <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                      {messageProvenance.controlNote}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant={msg.reviewStatus === 'saved' ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handleReviewStatus(msg.id, 'saved')}
                        disabled={msg.reviewStatus === 'saved'}
                      >
                        <CheckCircle2 {...decorativeIconProps} size={13} />
                        {msg.reviewStatus === 'saved' ? 'Saved' : 'Save'}
                      </Button>
                      <Button
                        type="button"
                        variant={msg.reviewStatus === 'dismissed' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => handleReviewStatus(msg.id, 'dismissed')}
                        disabled={msg.reviewStatus === 'dismissed'}
                      >
                        <X {...decorativeIconProps} size={13} />
                        {msg.reviewStatus === 'dismissed' ? 'Dismissed' : 'Dismiss'}
                      </Button>
                      {msg.reviewStatus && msg.reviewStatus !== 'draft' && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {msg.reviewStatus === 'saved' ? 'Saved' : 'Dismissed'}{formatReviewedTime(msg.reviewedAt) ? ` at ${formatReviewedTime(msg.reviewedAt)}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              </div>
            );
          })}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                <Bot {...decorativeIconProps} size={16} />
              </div>
              <div className="rounded-lg rounded-tl-sm border border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-3">
                <Loader2 {...decorativeIconProps} size={16} className="animate-spin text-[var(--text-muted)]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && (
          <div className="px-4 pb-3 space-y-3">
            <div className="flex flex-wrap gap-2" role="list" aria-label="Prompt suggestions">
              {suggestions.map(s => (
                <div key={s.label} role="listitem" aria-label={s.label}>
                  <button
                    onClick={() => handleSuggestionClick(s)}
                    className="rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                  >
                    {s.label}
                  </button>
                </div>
              ))}
            </div>
            {pendingSuggestion && (
              <div className="rounded-lg border border-accent/20 bg-accent-muted p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-accent mb-1">Draft Prompt</p>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{pendingSuggestion.prompt}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Cancel draft prompt"
                    onClick={() => {
                      setIsClearChatReviewOpen(false);
                      setPendingSuggestion(null);
                      setInput('');
                    }}
                  >
                    <X {...decorativeIconProps} size={14} />
                  </Button>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => handleSend(pendingSuggestion.prompt)} disabled={isTyping}>
                    <Send {...decorativeIconProps} size={13} />
                    Send to AI
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-4 border-t border-[var(--border-default)]">
          <div
            className="flex gap-2"
            role="form"
            aria-label="AI assistant prompt composer"
            data-ui="ai-assistant-prompt-composer"
          >
            <label htmlFor="ai-assistant-input" className="sr-only">Ask AI assistant</label>
            <p id="ai-assistant-input-help" className="sr-only">
              AI responses are draft guidance only. Review suggestions before applying them in destination workflows.
            </p>
            <input
              id="ai-assistant-input"
              type="text"
              value={input}
              aria-describedby="ai-assistant-input-help"
              onChange={(e) => {
                setIsClearChatReviewOpen(false);
                setInput(e.target.value);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about your career..."
              className="flex-1 h-10 px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />
            <Button size="icon" aria-label="Send message" onClick={() => handleSend()} disabled={!input.trim() || isTyping}>
              <Send {...decorativeIconProps} size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIAssistant;
