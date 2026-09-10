import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../../types/ai';

interface AIState {
  messages: ChatMessage[];
  isThinking: boolean;
  error: string | null;
}

const initialState: AIState = {
  messages: [],
  isThinking: false,
  error: null,
};

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    setThinking: (state, action: PayloadAction<boolean>) => {
      state.isThinking = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
});

export const { addMessage, setThinking, setError, clearMessages } = aiSlice.actions;
export default aiSlice.reducer;
