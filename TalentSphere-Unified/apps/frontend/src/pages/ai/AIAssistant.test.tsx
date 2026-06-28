import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByText(/AI service connection/)).toBeTruthy();
    expect(screen.getAllByText(/This is guidance only/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/OpenAI chat provider failed/i)).toBeNull();

    fireEvent.change(input, { target: { value: 'Retry with a resume-focused answer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(screen.getAllByText('Resume: Add measurable accessibility outcomes to the summary.').length).toBeGreaterThan(0);
    });
    expect(aiService.getChatResponse).toHaveBeenCalledTimes(2);
    expect(aiService.getChatResponse).toHaveBeenLastCalledWith('Retry with a resume-focused answer');
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });
});
