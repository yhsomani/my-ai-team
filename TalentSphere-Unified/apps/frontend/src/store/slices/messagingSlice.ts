import { createSlice, createAsyncThunk, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import { messagingService } from '../../services/messagingService';
import { Conversation, Message } from '../../types/messaging';
import { RootState } from '../index';

const conversationsAdapter = createEntityAdapter<Conversation>();
const defaultConversationPageSize = 20;
const defaultMessagePageSize = 50;

const getMessageTimestampMs = (message: Message) => {
  const timestamp = new Date(message.timestamp).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const mergeMessagesById = (messages: Message[]) => {
  const byId = new Map<string, Message>();
  messages.forEach(message => byId.set(message.id, message));
  return Array.from(byId.values()).sort((a, b) => getMessageTimestampMs(a) - getMessageTimestampMs(b));
};

type MessageReceivedPayload = Message | {
  message: Message;
  currentUserId?: string;
};

const normalizeMessageReceivedPayload = (payload: MessageReceivedPayload) => {
  if ('message' in payload) {
    return payload;
  }

  return { message: payload };
};

const isIncomingUnreadMessage = (message: Message, currentUserId?: string) => (
  Boolean(currentUserId) &&
  message.senderId !== currentUserId &&
  !message.readAt &&
  message.status !== 'READ'
);

export const fetchConversations = createAsyncThunk(
  'messaging/fetchConversations',
  async (userId: string) => {
    return await messagingService.getConversationsPage(userId, {
      limit: defaultConversationPageSize,
      offset: 0
    });
  }
);

export const loadMoreConversations = createAsyncThunk(
  'messaging/loadMoreConversations',
  async ({ userId, offset, limit = defaultConversationPageSize, cursor }: { userId: string; offset: number; limit?: number; cursor?: string | null }) => {
    return await messagingService.getConversationsPage(userId, {
      limit,
      offset,
      cursor: cursor || undefined
    });
  }
);

export const fetchMessages = createAsyncThunk(
  'messaging/fetchMessages',
  async ({ conversationId, userId, limit = defaultMessagePageSize }: { conversationId: string; userId: string; limit?: number }) => {
    return await messagingService.getMessagesPage(conversationId, userId, {
      limit,
      offset: 0
    });
  }
);

export const loadOlderMessages = createAsyncThunk(
  'messaging/loadOlderMessages',
  async ({ conversationId, userId, offset, limit = defaultMessagePageSize, cursor }: { conversationId: string; userId: string; offset: number; limit?: number; cursor?: string | null }) => {
    return await messagingService.getMessagesPage(conversationId, userId, {
      limit,
      offset,
      cursor: cursor || undefined
    });
  }
);

export const sendMessage = createAsyncThunk(
  'messaging/sendMessage',
  async (message: Partial<Message>) => {
    return await messagingService.sendMessage(message);
  }
);

export const markConversationMessagesRead = createAsyncThunk(
  'messaging/markConversationMessagesRead',
  async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
    const result = await messagingService.markConversationMessagesAsRead(conversationId, userId);
    return { conversationId, userId, readAt: result.readAt };
  }
);

interface MessagingState {
  activeConversationId: string | null;
  messages: Message[];
  realtimeMessageIds: string[];
  conversationTotal: number | null;
  conversationPageSize: number;
  hasMoreConversations: boolean;
  conversationNextCursor: string | null;
  messageTotal: number | null;
  messagePageSize: number;
  hasOlderMessages: boolean;
  messageNextCursor: string | null;
  messageHistoryStatus: 'idle' | 'loading' | 'loadingMore' | 'succeeded' | 'failed';
  messageHistoryError: 'initial' | 'older' | null;
  status: 'idle' | 'loading' | 'loadingMore' | 'succeeded' | 'failed';
}

const initialState = conversationsAdapter.getInitialState<MessagingState>({
  activeConversationId: null,
  messages: [],
  realtimeMessageIds: [],
  conversationTotal: null,
  conversationPageSize: defaultConversationPageSize,
  hasMoreConversations: false,
  conversationNextCursor: null,
  messageTotal: null,
  messagePageSize: defaultMessagePageSize,
  hasOlderMessages: false,
  messageNextCursor: null,
  messageHistoryStatus: 'idle',
  messageHistoryError: null,
  status: 'idle',
});

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    setActiveConversation: (state, action: PayloadAction<string>) => {
      state.activeConversationId = action.payload;
      state.messages = [];
      state.messageTotal = null;
      state.hasOlderMessages = false;
      state.messageNextCursor = null;
      state.messageHistoryStatus = 'idle';
      state.messageHistoryError = null;
    },
    messageReceived: (state, action: PayloadAction<MessageReceivedPayload>) => {
      const { message, currentUserId } = normalizeMessageReceivedPayload(action.payload);
      const isActiveConversationMessage = message.conversationId === state.activeConversationId;
      const isKnownActiveMessage = isActiveConversationMessage && state.messages.some(existing => existing.id === message.id);
      const isKnownRealtimeMessage = state.realtimeMessageIds.includes(message.id);
      const isNewMessageEvent = !isKnownActiveMessage && !isKnownRealtimeMessage;

      if (!isKnownRealtimeMessage) {
        state.realtimeMessageIds.push(message.id);
        if (state.realtimeMessageIds.length > 200) {
          state.realtimeMessageIds.shift();
        }
      }

      if (isActiveConversationMessage && !isKnownActiveMessage) {
        state.messages.push(message);
        state.messages = mergeMessagesById(state.messages);
        if (state.messageTotal !== null) {
          state.messageTotal += 1;
        }
      }

      if (message.conversationId) {
        const conversation = state.entities[message.conversationId];
        if (conversation) {
          const messageTimestampMs = getMessageTimestampMs(message);
          const lastMessageTimestampMs = conversation.lastMessage ? getMessageTimestampMs(conversation.lastMessage) : 0;
          if (!conversation.lastMessage || messageTimestampMs >= lastMessageTimestampMs) {
            conversation.lastMessage = message;
            conversation.updatedAt = typeof message.timestamp === 'string'
              ? message.timestamp
              : message.timestamp.toISOString();
          }

          if (isNewMessageEvent && isIncomingUnreadMessage(message, currentUserId)) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Map backend response to frontend Conversation type
        const mapped = action.payload.conversations.map((conv: any) => ({
          id: conv.id,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          isGroup: conv.isGroup,
          participants: conv.participants,
          participant: {
            id: conv.participant?.id || (conv.participants && conv.participants[0]),
            fullName: conv.participant?.fullName || conv.participantName || 'Connection',
            status: conv.participant?.status || 'online'
          },
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount ?? 0
        })) as Conversation[];
        conversationsAdapter.setAll(state, mapped);
        state.conversationTotal = action.payload.total;
        state.conversationPageSize = action.payload.limit ?? defaultConversationPageSize;
        state.hasMoreConversations = action.payload.hasNext;
        state.conversationNextCursor = action.payload.nextCursor;
      })
      .addCase(fetchConversations.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(loadMoreConversations.pending, (state) => {
        state.status = 'loadingMore';
      })
      .addCase(loadMoreConversations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const mapped = action.payload.conversations.map((conv: any) => ({
          id: conv.id,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          isGroup: conv.isGroup,
          participants: conv.participants,
          participant: {
            id: conv.participant?.id || (conv.participants && conv.participants[0]),
            fullName: conv.participant?.fullName || conv.participantName || 'Connection',
            status: conv.participant?.status || 'online'
          },
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount ?? 0
        })) as Conversation[];
        conversationsAdapter.upsertMany(state, mapped);
        if (action.payload.total !== null) {
          state.conversationTotal = action.payload.total;
        }
        state.conversationPageSize = action.payload.limit ?? state.conversationPageSize;
        state.hasMoreConversations = action.payload.hasNext;
        state.conversationNextCursor = action.payload.nextCursor;
      })
      .addCase(loadMoreConversations.rejected, (state) => {
        state.status = 'failed';
      })
      .addCase(fetchMessages.pending, (state) => {
        state.messageHistoryStatus = 'loading';
        state.messageHistoryError = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messageHistoryStatus = 'succeeded';
        state.messageHistoryError = null;
        state.messages = action.payload.messages;
        state.messageTotal = action.payload.total;
        state.messagePageSize = action.payload.limit ?? defaultMessagePageSize;
        state.hasOlderMessages = action.payload.hasNext;
        state.messageNextCursor = action.payload.nextCursor;
      })
      .addCase(fetchMessages.rejected, (state) => {
        state.messageHistoryStatus = 'failed';
        state.messageHistoryError = 'initial';
      })
      .addCase(loadOlderMessages.pending, (state) => {
        state.messageHistoryStatus = 'loadingMore';
        state.messageHistoryError = null;
      })
      .addCase(loadOlderMessages.fulfilled, (state, action) => {
        state.messageHistoryStatus = 'succeeded';
        state.messageHistoryError = null;
        state.messages = mergeMessagesById([...action.payload.messages, ...state.messages]);
        if (action.payload.total !== null) {
          state.messageTotal = action.payload.total;
        }
        state.messagePageSize = action.payload.limit ?? state.messagePageSize;
        state.hasOlderMessages = action.payload.hasNext;
        state.messageNextCursor = action.payload.nextCursor;
      })
      .addCase(loadOlderMessages.rejected, (state) => {
        state.messageHistoryStatus = 'failed';
        state.messageHistoryError = 'older';
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        if (!state.messages.some(message => message.id === action.payload.id)) {
          state.messages.push(action.payload);
          state.messages = mergeMessagesById(state.messages);
          if (state.messageTotal !== null) {
            state.messageTotal += 1;
          }
        }
      })
      .addCase(markConversationMessagesRead.fulfilled, (state, action) => {
        state.messages = state.messages.map(message => (
          message.conversationId === action.payload.conversationId &&
          message.senderId !== action.payload.userId &&
          !message.readAt
            ? { ...message, readAt: action.payload.readAt, status: 'READ' }
            : message
        ));

        const conversation = state.entities[action.payload.conversationId];
        if (conversation) {
          conversation.unreadCount = 0;
        }
        if (
          conversation?.lastMessage &&
          conversation.lastMessage.senderId !== action.payload.userId &&
          !conversation.lastMessage.readAt
        ) {
          conversation.lastMessage = {
            ...conversation.lastMessage,
            readAt: action.payload.readAt,
            status: 'READ'
          };
        }
      });
  },
});

export const { setActiveConversation, messageReceived } = messagingSlice.actions;

export const {
  selectAll: selectAllConversations,
  selectById: selectConversationById,
} = conversationsAdapter.getSelectors((state: RootState) => state.messaging);

export default messagingSlice.reducer;
