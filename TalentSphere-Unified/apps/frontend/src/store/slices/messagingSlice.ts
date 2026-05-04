import { createSlice, createAsyncThunk, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import { messagingService } from '../../services/messagingService';
import { Conversation, Message } from '../../types/messaging';
import { RootState } from '../index';

const conversationsAdapter = createEntityAdapter<Conversation>();

export const fetchConversations = createAsyncThunk(
  'messaging/fetchConversations',
  async (userId: string) => {
    return await messagingService.getConversations(userId);
  }
);

export const fetchMessages = createAsyncThunk(
  'messaging/fetchMessages',
  async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
    return await messagingService.getMessages(conversationId, userId);
  }
);

export const sendMessage = createAsyncThunk(
  'messaging/sendMessage',
  async (message: Partial<Message>) => {
    return await messagingService.sendMessage(message);
  }
);

interface MessagingState {
  activeConversationId: string | null;
  messages: Message[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState = conversationsAdapter.getInitialState<MessagingState>({
  activeConversationId: null,
  messages: [],
  status: 'idle',
});

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    setActiveConversation: (state, action: PayloadAction<string>) => {
      state.activeConversationId = action.payload;
    },
    messageReceived: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
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
        const mapped = action.payload.map((conv: any) => ({
          id: conv.id,
          participant: {
            id: conv.participant?.id || (conv.participants && conv.participants[0]),
            fullName: conv.participant?.fullName || conv.participantName || 'Connection',
            status: conv.participant?.status || 'online'
          },
          lastMessage: conv.lastMessage
        })) as Conversation[];
        conversationsAdapter.setAll(state, mapped);
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messages = action.payload;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messages.push(action.payload);
      });
  },
});

export const { setActiveConversation, messageReceived } = messagingSlice.actions;

export const {
  selectAll: selectAllConversations,
  selectById: selectConversationById,
} = conversationsAdapter.getSelectors((state: RootState) => state.messaging);

export default messagingSlice.reducer;
