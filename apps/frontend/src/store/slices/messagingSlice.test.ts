import { describe, expect, it } from 'vitest';
import messagingReducer, {
  fetchConversations,
  messageReceived,
  setActiveConversation,
} from './messagingSlice';
import type { Conversation, Message } from '../../types/messaging';

const seedActiveConversationState = (overrides?: Partial<Conversation>) => {
  const conversation: Conversation = {
    id: 'conv-1',
    isGroup: false,
    createdAt: '2026-06-25T10:00:00Z',
    updatedAt: '2026-06-25T10:00:00Z',
    participants: ['user-1', 'user-2'],
    lastMessage: {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-2',
      content: 'Earlier message',
      timestamp: '2026-06-25T10:00:00Z',
      status: 'SENT',
    },
    unreadCount: 2,
    ...overrides,
  };

  const loadedState = messagingReducer(undefined, fetchConversations.fulfilled({
    conversations: [conversation],
    total: 1,
    limit: 20,
    offset: 0,
    hasNext: false,
    nextCursor: null,
  }, 'request-1', 'user-1'));

  return messagingReducer(loadedState, setActiveConversation('conv-1'));
};

describe('messagingSlice realtime conversation state', () => {
  it('updates the active conversation preview and unread count for incoming realtime messages', () => {
    const incomingMessage: Message = {
      id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'user-2',
      content: 'New incoming message',
      timestamp: '2026-06-25T10:05:00Z',
      status: 'SENT',
    };

    const state = messagingReducer(seedActiveConversationState(), messageReceived({
      message: incomingMessage,
      currentUserId: 'user-1',
    }));

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].id).toBe('msg-2');
    expect(state.entities['conv-1']?.lastMessage?.id).toBe('msg-2');
    expect(state.entities['conv-1']?.updatedAt).toBe('2026-06-25T10:05:00Z');
    expect(state.entities['conv-1']?.unreadCount).toBe(3);

    const duplicateState = messagingReducer(state, messageReceived({
      message: incomingMessage,
      currentUserId: 'user-1',
    }));

    expect(duplicateState.messages).toHaveLength(1);
    expect(duplicateState.entities['conv-1']?.unreadCount).toBe(3);
  });

  it('updates the preview without incrementing unread count for the current user realtime echo', () => {
    const outgoingMessage: Message = {
      id: 'msg-3',
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: 'Current user message',
      timestamp: '2026-06-25T10:06:00Z',
      status: 'SENT',
    };

    const state = messagingReducer(seedActiveConversationState(), messageReceived({
      message: outgoingMessage,
      currentUserId: 'user-1',
    }));

    expect(state.messages).toHaveLength(1);
    expect(state.entities['conv-1']?.lastMessage?.id).toBe('msg-3');
    expect(state.entities['conv-1']?.unreadCount).toBe(2);
  });

  it('updates non-active visible conversation rows without appending to the active thread', () => {
    const conversationOne: Conversation = {
      id: 'conv-1',
      participants: ['user-1', 'user-2'],
      unreadCount: 0,
      lastMessage: {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        content: 'Active thread message',
        timestamp: '2026-06-25T10:00:00Z',
        status: 'SENT',
      },
      updatedAt: '2026-06-25T10:00:00Z',
    };
    const conversationTwo: Conversation = {
      id: 'conv-2',
      participants: ['user-1', 'user-3'],
      unreadCount: 1,
      lastMessage: {
        id: 'msg-2',
        conversationId: 'conv-2',
        senderId: 'user-3',
        content: 'Older visible row message',
        timestamp: '2026-06-25T09:00:00Z',
        status: 'SENT',
      },
      updatedAt: '2026-06-25T09:00:00Z',
    };
    const loadedState = messagingReducer(undefined, fetchConversations.fulfilled({
      conversations: [conversationOne, conversationTwo],
      total: 2,
      limit: 20,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    }, 'request-1', 'user-1'));
    const activeState = messagingReducer(loadedState, setActiveConversation('conv-1'));
    const incomingMessage: Message = {
      id: 'msg-4',
      conversationId: 'conv-2',
      senderId: 'user-3',
      content: 'New visible row message',
      timestamp: '2026-06-25T10:10:00Z',
      status: 'SENT',
    };

    const state = messagingReducer(activeState, messageReceived({
      message: incomingMessage,
      currentUserId: 'user-1',
    }));

    expect(state.messages).toHaveLength(0);
    expect(state.entities['conv-2']?.lastMessage?.id).toBe('msg-4');
    expect(state.entities['conv-2']?.updatedAt).toBe('2026-06-25T10:10:00Z');
    expect(state.entities['conv-2']?.unreadCount).toBe(2);

    const duplicateState = messagingReducer(state, messageReceived({
      message: incomingMessage,
      currentUserId: 'user-1',
    }));

    expect(duplicateState.messages).toHaveLength(0);
    expect(duplicateState.entities['conv-2']?.unreadCount).toBe(2);
  });
});
