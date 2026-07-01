import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import authReducer from '../../store/slices/authSlice';
import messagingReducer from '../../store/slices/messagingSlice';
import { messagingService } from '../../services/messagingService';
import type { PaginatedConversationsResult, PaginatedMessagesResult } from '../../services/messagingService';
import { fileUploadService } from '../../services/fileUploadService';
import MessagingPage from './MessagingPage';

vi.mock('../../services/messagingService', () => ({
  messagingService: {
    getConversationsPage: vi.fn(),
    getMessagesPage: vi.fn(),
    sendMessage: vi.fn(),
    markConversationMessagesAsRead: vi.fn(),
  },
}));

vi.mock('../../services/fileUploadService', () => ({
  fileUploadService: {
    uploadFile: vi.fn(),
  },
}));

vi.mock('../../lib/messagingWorkflowAnalytics', () => ({
  recordMessagingWorkflowAnalytics: vi.fn(),
}));

vi.mock('../../lib/supabaseClient', () => {
  const channel: {
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  } = {
    on: vi.fn(() => channel),
    subscribe: vi.fn((callback?: (status: string) => void) => {
      callback?.('SUBSCRIBED');
      return channel;
    }),
  };

  return {
    typedSupabase: {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
  };
});

const conversationId = 'conversation-lena-001';
const currentUserId = 'message-user';
const participantId = 'candidate-lena-001';

const conversationPage: PaginatedConversationsResult = {
  conversations: [
    {
      id: conversationId,
      createdAt: '2026-06-27T08:00:00.000Z',
      updatedAt: '2026-06-27T08:30:00.000Z',
      isGroup: false,
      participants: [currentUserId, participantId],
      participant: {
        id: participantId,
        fullName: 'Lena Ortiz',
        status: 'online',
      },
      lastMessage: {
        id: 'message-preview-001',
        conversationId,
        senderId: participantId,
        content: 'Can you share the latest portfolio link?',
        messageType: 'TEXT',
        status: 'SENT',
        timestamp: '2026-06-27T08:30:00.000Z',
      },
      unreadCount: 1,
    },
  ],
  total: 1,
  limit: 20,
  offset: 0,
  hasNext: false,
  nextCursor: null,
};

const messagePage: PaginatedMessagesResult = {
  messages: [
    {
      id: 'message-lena-001',
      conversationId,
      senderId: participantId,
      content: 'Can you share the latest portfolio link?',
      messageType: 'TEXT',
      status: 'SENT',
      timestamp: '2026-06-27T08:30:00.000Z',
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
  hasNext: false,
  nextCursor: null,
};

const renderMessagingPage = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      messaging: messagingReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: currentUserId,
          email: 'message-user@example.com',
          roles: ['ROLE_USER'],
        },
        session: null,
        loading: false,
      },
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      serializableCheck: false,
    }),
  });

  render(
    <Provider store={store}>
      <ToastProvider>
        <MessagingPage />
      </ToastProvider>
    </Provider>,
  );

  return store;
};

describe('MessagingPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(messagingService.getConversationsPage).mockResolvedValue({
      conversations: [],
      total: 0,
      limit: 20,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    });
    vi.mocked(messagingService.getMessagesPage).mockResolvedValue({
      messages: [],
      total: 0,
      limit: 50,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows safe conversation load failure copy without exposing raw provider errors', async () => {
    vi.mocked(messagingService.getConversationsPage).mockRejectedValue(
      new Error('PostgREST messages query failed with service_role_token=secret'),
    );

    renderMessagingPage();

    await waitFor(() => {
      expect(screen.getAllByRole('alert').some(alert => alert.textContent?.includes('Messages could not load'))).toBe(true);
    });

    expect(screen.getAllByText(/conversation data did not respond/i).length).toBeGreaterThan(0);
    const retryButtons = screen.getAllByRole('button', { name: 'Retry conversations' });
    expect(retryButtons.length).toBeGreaterThan(0);
    retryButtons.forEach((button) => {
      expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(button.querySelector('svg')?.getAttribute('focusable')).toBe('false');
    });
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/PostgREST messages query failed/i)).toBeNull();
  });

  it('retries the existing conversation load workflow from the safe failure state', async () => {
    vi.mocked(messagingService.getConversationsPage)
      .mockRejectedValueOnce(new Error('PostgREST messages query failed with service_role_token=secret'))
      .mockResolvedValue(conversationPage);

    renderMessagingPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Retry conversations' }).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Retry conversations' })[0]);

    await waitFor(() => {
      expect(messagingService.getConversationsPage).toHaveBeenCalledWith(currentUserId, {
        limit: 20,
        offset: 0,
      });
      expect(vi.mocked(messagingService.getConversationsPage).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    await waitFor(() => {
      expect(screen.getAllByText('Lena Ortiz').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe message-history failure copy and retries the existing history workflow', async () => {
    vi.mocked(messagingService.getConversationsPage).mockResolvedValue(conversationPage);
    vi.mocked(messagingService.getMessagesPage)
      .mockRejectedValueOnce(new Error('Message history failed with service_role_token=secret'))
      .mockResolvedValue(messagePage);

    renderMessagingPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Lena Ortiz/ }).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Lena Ortiz/ })[0]);

    await waitFor(() => {
      expect(screen.getByText(/message history did not respond/i)).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: 'Retry message history' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Message history failed/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Retry message history' }));

    await waitFor(() => {
      expect(messagingService.getMessagesPage).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getAllByText('Can you share the latest portfolio link?').length).toBeGreaterThan(0);
    });
  });

  it('exposes conversation rows and thread actions with descriptive accessible names', async () => {
    vi.mocked(messagingService.getConversationsPage).mockResolvedValue(conversationPage);
    vi.mocked(messagingService.getMessagesPage).mockResolvedValue(messagePage);

    renderMessagingPage();

    await waitFor(() => {
      expect(screen.getAllByRole('list', { name: 'Conversations' }).length).toBeGreaterThan(0);
    });

    const sourceStatus = screen.getByRole('group', { name: 'Messaging source status' });
    expect(within(sourceStatus).getByText('Account messages').closest('[data-ui="source-status-badge"]')?.getAttribute('data-source-status')).toBe('account');
    expect(within(sourceStatus).getByText('Calls unavailable').closest('[data-ui="source-status-badge"]')?.getAttribute('data-source-status')).toBe('unavailable');

    const conversationButtons = screen.getAllByRole('button', {
      name: /Open conversation with Lena Ortiz\. 1 unread message\. Last message: Can you share the latest portfolio link\?\. Status: Online\./,
    });
    expect(conversationButtons.length).toBeGreaterThan(0);

    screen.getAllByLabelText('Search conversations').forEach((input) => {
      const icon = input.closest('div')?.querySelector('svg');
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
      expect(icon?.getAttribute('focusable')).toBe('false');
    });
    conversationButtons.forEach((button) => {
      expect(button.querySelector('[aria-hidden="true"]')?.textContent).toBe('LO');
      expect(button.querySelector('.bg-success')?.getAttribute('aria-hidden')).toBe('true');
    });

    fireEvent.click(conversationButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('log', { name: 'Messages with Lena Ortiz' })).toBeTruthy();
    });
    expect(conversationButtons[0].getAttribute('aria-current')).toBe('true');
    const backButton = screen.getByRole('button', { name: 'Back to conversations' });
    const markReadButton = screen.getByRole('button', { name: 'Mark 1 visible unread message as read' });
    expect(backButton.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('Realtime connected').querySelector('[aria-hidden="true"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('1 of 1 loaded').querySelector('svg')?.getAttribute('focusable')).toBe('false');
    expect(markReadButton.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Voice calls unavailable' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Video calls unavailable' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'More messaging actions unavailable' })).toBeNull();
    const composer = screen.getByRole('form', { name: 'Message composer' });
    expect(composer.getAttribute('data-ui')).toBe('messaging-composer-form');
    const composerInput = screen.getByLabelText('Message text');
    expect(composerInput).toBeTruthy();
    expect(composer.contains(composerInput)).toBe(true);
    expect(composerInput.getAttribute('aria-describedby')).toBe('message-composer-help message-send-status');
    expect(screen.getByText(/Review message text, reply suggestions, and attachment drafts before sending/i).id).toBe('message-composer-help');
    expect(screen.getByRole('button', { name: 'Add attachment link' }).querySelector('svg')?.getAttribute('focusable')).toBe('false');
  });

  it('shows safe failed-send copy and retries the existing message send workflow', async () => {
    const reply = 'I can send the portfolio link now.';
    vi.mocked(messagingService.getConversationsPage).mockResolvedValue(conversationPage);
    vi.mocked(messagingService.getMessagesPage).mockResolvedValue(messagePage);
    vi.mocked(messagingService.sendMessage)
      .mockRejectedValueOnce(new Error('Message insert failed with service_role_token=secret'))
      .mockResolvedValue({
        id: 'message-retry-sent-001',
        conversationId,
        senderId: currentUserId,
        content: reply,
        messageType: 'TEXT',
        status: 'SENT',
        timestamp: '2026-06-27T09:00:00.000Z',
      });

    renderMessagingPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Lena Ortiz/ }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Lena Ortiz/ })[0]);

    await waitFor(() => {
      expect(screen.getByRole('log', { name: 'Messages with Lena Ortiz' })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Message text'), { target: { value: reply } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(screen.getByText('Message failed to send. Retry available.')).toBeTruthy();
    });

    expect(screen.getByText(reply)).toBeTruthy();
    expect(screen.getByText('Failed to send')).toBeTruthy();
    expect(screen.getByText('Failed to send').parentElement?.querySelector('.text-destructive')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Message insert failed/i)).toBeNull();
    expect(messagingService.sendMessage).toHaveBeenCalledTimes(1);

    const retryButton = screen.getByRole('button', { name: 'Retry failed message' });
    expect(retryButton.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(messagingService.sendMessage).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByText('Message sent.')).toBeTruthy();
    });
    expect(screen.queryByText('Failed to send')).toBeNull();
  });

  it('shows safe attachment upload failure copy without exposing raw provider errors', async () => {
    vi.mocked(messagingService.getConversationsPage).mockResolvedValue(conversationPage);
    vi.mocked(messagingService.getMessagesPage).mockResolvedValue(messagePage);
    vi.mocked(fileUploadService.uploadFile).mockRejectedValueOnce(
      new Error('File provider failed with service_role_token=secret'),
    );

    renderMessagingPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Lena Ortiz/ }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Lena Ortiz/ })[0]);

    await waitFor(() => {
      expect(screen.getByRole('log', { name: 'Messages with Lena Ortiz' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add attachment link' }));

    expect(screen.getByRole('button', { name: 'Hide attachment link field' }).querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('Attachment link').parentElement?.querySelector('svg')?.getAttribute('focusable')).toBe('false');
    expect(screen.getByRole('button', { name: 'Remove attachment link' }).querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('button', { name: 'Upload file' }).querySelector('svg')?.getAttribute('focusable')).toBe('false');

    fireEvent.change(screen.getByLabelText('Upload message attachment'), {
      target: {
        files: [new File(['portfolio fixture'], 'portfolio.pdf', { type: 'application/pdf' })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('File could not upload. Try again or add a link.')).toBeTruthy();
    });

    expect(fileUploadService.uploadFile).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/File provider failed/i)).toBeNull();
  });

  it('shows safe mark-read failure copy without exposing raw provider errors', async () => {
    vi.mocked(messagingService.getConversationsPage).mockResolvedValue(conversationPage);
    vi.mocked(messagingService.getMessagesPage).mockResolvedValue(messagePage);
    vi.mocked(messagingService.markConversationMessagesAsRead).mockRejectedValueOnce(
      new Error('Read receipt update failed with service_role_token=secret'),
    );

    renderMessagingPage();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Lena Ortiz/ }).length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole('button', { name: /Lena Ortiz/ })[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark 1 visible unread message as read' })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mark 1 visible unread message as read' }));

    await waitFor(() => {
      expect(screen.getByText('Visible messages could not be marked read. Retry available.')).toBeTruthy();
    });

    expect(messagingService.markConversationMessagesAsRead).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Read receipt update failed/i)).toBeNull();
  });
});
