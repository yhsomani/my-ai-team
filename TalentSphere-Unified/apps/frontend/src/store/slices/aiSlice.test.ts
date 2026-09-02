import { describe, expect, it } from 'vitest';
import aiReducer, { addMessage, setThinking, setError, clearMessages } from './aiSlice';
import type { ChatMessage } from '../../types/ai';

describe('aiSlice', () => {
  const initial = {
    messages: [],
    isThinking: false,
    error: null,
  };

  it('handles initial state', () => {
    expect(aiReducer(undefined, { type: 'unknown' })).toEqual(initial);
  });

  it('adds new messages to the history', () => {
    const msg1: ChatMessage = {
      id: 'msg-1',
      role: 'user',
      content: 'How should I improve my resume?',
      timestamp: new Date('2026-06-25T10:00:00Z'),
    };

    const state = aiReducer(initial, addMessage(msg1));
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toEqual(msg1);

    const msg2: ChatMessage = {
      id: 'msg-2',
      role: 'assistant',
      content: 'Highlight quantifiable outcomes in each role.',
      timestamp: new Date('2026-06-25T10:00:05Z'),
    };

    const nextState = aiReducer(state, addMessage(msg2));
    expect(nextState.messages).toHaveLength(2);
    expect(nextState.messages[1]).toEqual(msg2);
  });

  it('updates isThinking flag', () => {
    const state = aiReducer(initial, setThinking(true));
    expect(state.isThinking).toBe(true);

    const readyState = aiReducer(state, setThinking(false));
    expect(readyState.isThinking).toBe(false);
  });

  it('sets and clears error state', () => {
    const errorState = aiReducer(initial, setError('AI model unavailable'));
    expect(errorState.error).toBe('AI model unavailable');

    const clearedState = aiReducer(errorState, setError(null));
    expect(clearedState.error).toBeNull();
  });

  it('clears all messages from state', () => {
    const populatedState = {
      messages: [
        { id: '1', role: 'user', content: 'Hi', timestamp: new Date('2026-06-25') } as ChatMessage,
      ],
      isThinking: false,
      error: null,
    };

    const state = aiReducer(populatedState, clearMessages());
    expect(state.messages).toHaveLength(0);
  });
});
