import { describe, expect, it } from 'vitest';
import type { Message } from '../types/messaging';
import { buildMessagingReplySuggestions, getLatestMessage } from './messagingReplySuggestions';

const message = (overrides: Partial<Message>): Message => ({
  id: overrides.id || 'message-1',
  conversationId: 'conversation-1',
  senderId: overrides.senderId || 'user-2',
  content: overrides.content || 'Hello',
  timestamp: overrides.timestamp || '2026-06-04T09:00:00.000Z',
  status: 'SENT',
  ...overrides,
});

describe('messagingReplySuggestions', () => {
  it('builds draft-only scheduling suggestions for latest incoming messages', () => {
    const suggestions = buildMessagingReplySuggestions({
      currentUserId: 'user-1',
      messages: [
        message({ id: 'older', content: 'Thanks', timestamp: '2026-06-04T08:00:00.000Z' }),
        message({
          id: 'latest',
          content: 'Are you available for an interview call tomorrow?',
          timestamp: '2026-06-04T09:00:00.000Z',
        }),
      ],
    });

    expect(suggestions.map(suggestion => suggestion.id)).toEqual([
      'coordinate-time',
      'answer-soon',
      'acknowledge-update',
    ]);
    expect(suggestions[0].text).toContain('Please share a few options');
  });

  it('does not suggest replies after the current user has already responded', () => {
    const suggestions = buildMessagingReplySuggestions({
      currentUserId: 'user-1',
      messages: [
        message({ id: 'incoming', senderId: 'user-2', content: 'Can you review this?' }),
        message({
          id: 'outgoing',
          senderId: 'user-1',
          content: 'I will review it.',
          timestamp: '2026-06-04T10:00:00.000Z',
        }),
      ],
    });

    expect(suggestions).toEqual([]);
  });

  it('uses timestamp order when selecting the latest message', () => {
    const latest = getLatestMessage([
      message({ id: 'first', timestamp: '2026-06-04T08:00:00.000Z' }),
      message({ id: 'second', timestamp: '2026-06-04T10:00:00.000Z' }),
      message({ id: 'invalid', timestamp: 'not-a-date' }),
    ]);

    expect(latest.id).toBe('second');
  });
});
