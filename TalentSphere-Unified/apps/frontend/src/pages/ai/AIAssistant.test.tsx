import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import { aiService } from '../../services/aiService';
import authReducer from '../../store/slices/authSlice';
import AIAssistant from './AIAssistant';

vi.mock('../../services/aiService', () => ({
  aiService: {
    getLatestSession: vi.fn(),
    saveSession: vi.fn(),
    deleteSession: vi.fn(),
    getChatResponse: vi.fn(),
    saveAutomationSuggestion: vi.fn(),
    updateAutomationSuggestionStatus: vi.fn(),
  },
}));

vi.mock('../../lib/automationSuggestionAudit', () => ({
  automationSuggestionAudit: {
    recordEvent: vi.fn(),
  },
}));

vi.mock('../../lib/productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

vi.mock('../../lib/aiAssistantWorkflowAnalytics', () => ({
  recordAIAssistantWorkflowAnalytics: vi.fn(),
}));

const storageKey = 'talentsphere.ai.chat.ai-user';

const installLocalStorageMock = () => {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => {
      values.clear();
    },
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };

  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
  });

  return storage;
};

const renderAiAssistant = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'ai-user',
          email: 'ai-user@example.com',
          roles: ['ROLE_USER'],
        },
        session: null,
        loading: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/ai']}>
        <ToastProvider>
          <AIAssistant />
        </ToastProvider>
      </MemoryRouter>
    </Provider>,
  );

  return store;
};

const expectSvgIconsDecorative = (container: ParentNode) => {
  const icons = Array.from(container.querySelectorAll('svg'));
  expect(icons.length).toBeGreaterThan(0);

  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('AIAssistant', () => {
  beforeEach(() => {
    installLocalStorageMock();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.localStorage.removeItem(storageKey);
    vi.mocked(aiService.getLatestSession).mockResolvedValue(null);
    vi.mocked(aiService.saveSession).mockResolvedValue({
      id: 'ai-session',
      userId: 'ai-user',
      title: 'AI Assistant',
      messages: [],
      lastSavedAt: '2026-06-28T00:00:00.000Z',
      createdAt: '2026-06-28T00:00:00.000Z',
      updatedAt: '2026-06-28T00:00:00.000Z',
    });
    vi.mocked(aiService.deleteSession).mockResolvedValue(undefined);
    vi.mocked(aiService.saveAutomationSuggestion).mockResolvedValue({
      id: 'ai-suggestion',
      userId: 'ai-user',
      sessionId: 'ai-session',
      suggestionType: 'chat_response',
      content: '',
      reviewStatus: 'draft',
      createdAt: '2026-06-28T00:00:00.000Z',
      updatedAt: '2026-06-28T00:00:00.000Z',
    });
    vi.mocked(aiService.updateAutomationSuggestionStatus).mockResolvedValue({
      id: 'ai-suggestion',
      userId: 'ai-user',
      sessionId: 'ai-session',
      suggestionType: 'chat_response',
      content: '',
      reviewStatus: 'saved',
      reviewedAt: '2026-06-28T00:00:00.000Z',
      createdAt: '2026-06-28T00:00:00.000Z',
      updatedAt: '2026-06-28T00:00:00.000Z',
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.localStorage.removeItem(storageKey);
  });

  it('exposes prompt suggestions, conversation messages, and draft recommendations with semantic structure', async () => {
    renderAiAssistant();

    await waitFor(() => {
      expect(screen.getByRole('log', { name: 'AI conversation' })).toBeTruthy();
    });
    expectSvgIconsDecorative(document.body);
    const composer = screen.getByRole('form', { name: 'AI assistant prompt composer' });
    const composerInput = within(composer).getByLabelText('Ask AI assistant');
    const composerHelp = screen.getByText(/AI responses are draft guidance only/i);
    expect(composerInput.getAttribute('aria-describedby')).toBe('ai-assistant-input-help');
    expect(composerHelp.id).toBe('ai-assistant-input-help');
    const heuristicHeaderBadge = screen.getByText('Heuristic AI guidance').closest('[data-ui="source-status-badge"]');
    expect(heuristicHeaderBadge?.getAttribute('data-source-status')).toBe('heuristic');

    const promptSuggestions = screen.getByRole('list', { name: 'Prompt suggestions' });
    expect(within(promptSuggestions).getByRole('listitem', { name: 'Review my resume' })).toBeTruthy();
    expect(within(promptSuggestions).getByRole('listitem', { name: 'Recommend skills to learn' })).toBeTruthy();
    expect(within(screen.getByRole('log', { name: 'AI conversation' })).getByRole('article', {
      name: 'AI assistant message 1. Welcome message.',
    })).toBeTruthy();

    fireEvent.click(within(promptSuggestions).getByRole('button', { name: 'Review my resume' }));
    expect(screen.getByRole('button', { name: 'Cancel draft prompt' }).querySelector('svg')?.getAttribute('focusable')).toBe('false');
    expect(screen.getByRole('button', { name: 'Send to AI' }).querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expectSvgIconsDecorative(document.body);

    cleanup();

    window.localStorage.setItem(storageKey, JSON.stringify({
      sessionId: 'ai-session-seeded',
      savedAt: '2026-06-28T10:00:00.000Z',
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hi! I'm your AI career assistant.",
          createdAt: '2026-06-28T10:00:00.000Z',
        },
        {
          id: 'ai-user-message',
          role: 'user',
          content: 'Review my resume',
          createdAt: '2026-06-28T10:01:00.000Z',
        },
        {
          id: 'ai-draft-message',
          role: 'assistant',
          content: 'Resume: Add measurable accessibility outcomes to the summary.',
          createdAt: '2026-06-28T10:02:00.000Z',
          reviewStatus: 'draft',
        },
      ],
    }));

    renderAiAssistant();

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'AI draft recommendations' })).toBeTruthy();
    });

    const recommendationList = screen.getByRole('list', { name: 'AI draft recommendations' });
    expect(within(recommendationList).getByRole('listitem', {
      name: 'Draft AI recommendation for Resume Builder. Source: Heuristic AI guidance.',
    })).toBeTruthy();

    const conversation = screen.getByRole('log', { name: 'AI conversation' });
    expect(within(conversation).getByRole('article', { name: 'You message 2.' })).toBeTruthy();
    expect(within(conversation).getByRole('article', {
      name: 'AI assistant message 3. Draft recommendation.',
    })).toBeTruthy();
    expect(screen.getAllByText('Heuristic AI guidance').some((label) => (
      label.closest('[data-source-status="heuristic"]')
    ))).toBe(true);
    expectSvgIconsDecorative(document.body);
  });

  it('shows safe provider failure copy and retries the existing chat workflow without exposing raw provider errors', async () => {
    vi.mocked(aiService.getChatResponse)
      .mockRejectedValueOnce(new Error('OpenAI chat provider failed with service_role_token=secret'))
      .mockResolvedValueOnce({
        message: 'Resume: Add measurable accessibility outcomes to the summary.',
      });

    renderAiAssistant();

    const input = screen.getByLabelText('Ask AI assistant');
    fireEvent.change(input, { target: { value: 'Try the AI provider' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(screen.getAllByText("Sorry, I'm having trouble connecting to the AI service right now.").length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('heading', { name: 'AI Assistant' })).toBeTruthy();
    expect(screen.getByText(/AI service unavailable/).closest('[data-source-status="unavailable"]')).toBeTruthy();
    expect(screen.getAllByText(/This is guidance only/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/OpenAI chat provider failed/i)).toBeNull();

    fireEvent.change(input, { target: { value: 'Retry with a resume-focused answer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(screen.getAllByText('Resume: Add measurable accessibility outcomes to the summary.').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Heuristic AI guidance').some((label) => (
      label.closest('[data-source-status="heuristic"]')
    ))).toBe(true);
    expect(aiService.getChatResponse).toHaveBeenCalledTimes(2);
    expect(aiService.getChatResponse).toHaveBeenLastCalledWith('Retry with a resume-focused answer');
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expectSvgIconsDecorative(document.body);
  });
});
