import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, Sparkles, Loader2, Trash2, CheckCircle2, X } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { aiService } from '../../services/aiService';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { useAppSelector } from '../../store/hooks';
import { useToast } from '../../components/shared/Toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  sourceLabel?: string;
  sourceDetail?: string;
  controlNote?: string;
  reviewStatus?: 'draft' | 'saved' | 'dismissed';
  reviewedAt?: string;
}

interface StoredChat {
  messages: Message[];
  savedAt: string;
}

interface PromptSuggestion {
  label: string;
  prompt: string;
}

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

const createAssistantDraftMessage = (content: string, sourceLabel = 'TalentSphere AI assistant'): Message => ({
  id: createMessageId(),
  role: 'assistant',
  content,
  createdAt: new Date().toISOString(),
  sourceLabel,
  sourceDetail: 'Generated from your prompt through the chat-assistant service.',
  controlNote: 'This is guidance only. It does not change your profile, resume, applications, or settings.',
  reviewStatus: 'draft',
});

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
        messages: parsed.messages,
        savedAt: parsed.savedAt || new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('Failed to load AI chat history:', error);
  }
  return null;
};

const saveStoredChat = (storageKey: string, messages: Message[]) => {
  if (typeof window === 'undefined') return null;
  const savedAt = new Date().toISOString();
  window.localStorage.setItem(storageKey, JSON.stringify({ messages, savedAt }));
  return savedAt;
};

const formatSavedTime = (value: string | null) => {
  if (!value) return 'Not saved yet';
  return `Saved ${new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const formatReviewedTime = (value?: string) => {
  if (!value) return null;
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AIAssistant: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();
  const storageKey = useMemo(() => `talentsphere.ai.chat.${user?.id || 'guest'}`, [user?.id]);
  const [messages, setMessages] = useState<Message[]>([createWelcomeMessage()]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<PromptSuggestion | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoadedStorageKey(null);
    const storedChat = getStoredChat(storageKey);
    setMessages(storedChat?.messages?.length ? storedChat.messages : [createWelcomeMessage()]);
    setLastSavedAt(storedChat?.savedAt || null);
    setPendingSuggestion(null);
    setInput('');
    setLoadedStorageKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedStorageKey !== storageKey) return;
    try {
      const savedAt = saveStoredChat(storageKey, messages);
      setLastSavedAt(savedAt);
    } catch (error) {
      console.error('Failed to save AI chat history:', error);
    }
  }, [loadedStorageKey, messages, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    setIsTyping(true);

    try {
      const response = await aiService.getChatResponse(messageText);
      const aiMsg = createAssistantDraftMessage(response.message || "I'm sorry, I couldn't process that request.");
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI chat error:", error);
      const errorMsg = createAssistantDraftMessage(
        "Sorry, I'm having trouble connecting to the AI service right now.",
        'AI service connection'
      );
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleReviewStatus = (messageId: string, reviewStatus: 'saved' | 'dismissed') => {
    setMessages(prev => prev.map(message => (
      message.id === messageId
        ? {
            ...message,
            reviewStatus,
            reviewedAt: new Date().toISOString(),
          }
        : message
    )));
    addToast({
      type: reviewStatus === 'saved' ? 'success' : 'info',
      title: reviewStatus === 'saved' ? 'Recommendation saved' : 'Recommendation dismissed',
      message: 'This only updates your local AI chat history.',
    });
  };

  const handleSuggestionClick = (suggestion: PromptSuggestion) => {
    setPendingSuggestion(suggestion);
    setInput(suggestion.prompt);
  };

  const handleClearChat = () => {
    setMessages([createWelcomeMessage()]);
    setInput('');
    setPendingSuggestion(null);
    addToast({
      type: 'success',
      title: 'Chat cleared',
      message: 'Your AI assistant history has been reset for this browser.',
    });
  };

  const suggestions: PromptSuggestion[] = [
    {
      label: 'Review my resume',
      prompt: 'Review my resume for clarity, measurable impact, and missing keywords. Return suggestions as a checklist and do not rewrite or change profile data unless I approve each change.',
    },
    {
      label: 'Prepare for interviews',
      prompt: 'Create an interview prep plan for my next role search with likely questions, practice tasks, and what I should review first.',
    },
    {
      label: 'Suggest career paths',
      prompt: 'Suggest career paths based on my current skills and goals. Explain why each path fits and what I should validate before choosing one.',
    },
    {
      label: 'Recommend skills to learn',
      prompt: 'Recommend the highest-impact skills I should learn next. Include why they matter, how to practice them, and what evidence I can add to my profile after I approve it.',
    },
  ];

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <PageHeader
        title="AI Assistant"
        description="Get personalized career guidance powered by AI."
        badge={<Badge variant="default"><Sparkles size={12} className="mr-1" /> Beta</Badge>}
        actions={
          <>
            <Badge variant="outline" className="hidden sm:inline-flex">
              {formatSavedTime(lastSavedAt)}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleClearChat} disabled={isTyping || messages.length <= 1}>
              <Trash2 size={14} />
              Clear
            </Button>
          </>
        }
      />

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'assistant' ? 'bg-accent/10 text-accent' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
              }`}>
                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className={`max-w-[70%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent text-white rounded-tr-sm'
                  : 'bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-tl-sm'
              }`}>
                {msg.content}
                {msg.role === 'assistant' && msg.id !== 'welcome' && (
                  <div className="mt-3 space-y-2 border-t border-[var(--border-default)] pt-2">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        Draft response
                      </span>
                      <span>Source: {msg.sourceLabel || 'TalentSphere AI assistant'}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                      {msg.sourceDetail || 'Generated from your prompt through the chat-assistant service.'}
                    </p>
                    <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                      {msg.controlNote || 'This is guidance only. It does not change your profile, resume, applications, or settings.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant={msg.reviewStatus === 'saved' ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handleReviewStatus(msg.id, 'saved')}
                        disabled={msg.reviewStatus === 'saved'}
                      >
                        <CheckCircle2 size={13} />
                        {msg.reviewStatus === 'saved' ? 'Saved' : 'Save'}
                      </Button>
                      <Button
                        type="button"
                        variant={msg.reviewStatus === 'dismissed' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => handleReviewStatus(msg.id, 'dismissed')}
                        disabled={msg.reviewStatus === 'dismissed'}
                      >
                        <X size={13} />
                        {msg.reviewStatus === 'dismissed' ? 'Dismissed' : 'Dismiss'}
                      </Button>
                      {msg.reviewStatus && msg.reviewStatus !== 'draft' && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {msg.reviewStatus === 'saved' ? 'Saved' : 'Dismissed'} locally{formatReviewedTime(msg.reviewedAt) ? ` at ${formatReviewedTime(msg.reviewedAt)}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-tl-sm">
                <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && (
          <div className="px-4 pb-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              {suggestions.map(s => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestionClick(s)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
            {pendingSuggestion && (
              <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
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
                      setPendingSuggestion(null);
                      setInput('');
                    }}
                  >
                    <X size={14} />
                  </Button>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={() => handleSend(pendingSuggestion.prompt)} disabled={isTyping}>
                    <Send size={13} />
                    Send to AI
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-4 border-t border-[var(--border-default)]">
          <div className="flex gap-2">
            <label htmlFor="ai-assistant-input" className="sr-only">Ask AI assistant</label>
            <input
              id="ai-assistant-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything about your career..."
              className="flex-1 h-10 px-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            />
            <Button size="icon" aria-label="Send message" onClick={() => handleSend()} disabled={!input.trim() || isTyping}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIAssistant;
