import { describe, expect, it } from 'vitest';
import challengeReducer, {
  clearChallengeError,
  fetchChallenges,
  selectAllChallenges,
  selectChallengeById,
} from './challengeSlice';
import type { Challenge } from '../../types/challenges';

describe('challengeSlice', () => {
  const initial = {
    ids: [],
    entities: {},
    status: 'idle',
    error: null,
  };

  const sampleChallenge: Challenge = {
    id: 'ch-1',
    title: 'Two Sum in TypeScript',
    description: 'Find two indices that sum up to target.',
    difficulty: 'Easy',
    xpReward: 100,
    is_active: true,
  };

  it('handles initial state', () => {
    expect(challengeReducer(undefined, { type: 'unknown' })).toEqual(initial);
  });

  it('handles fetchChallenges.pending', () => {
    const state = challengeReducer(initial, { type: fetchChallenges.pending.type });
    expect(state.status).toBe('loading');
  });

  it('handles fetchChallenges.fulfilled', () => {
    const payload: Challenge[] = [sampleChallenge];
    const state = challengeReducer(initial, {
      type: fetchChallenges.fulfilled.type,
      payload,
    });

    expect(state.status).toBe('succeeded');
    expect(state.ids).toEqual(['ch-1']);
    expect(state.entities['ch-1']).toEqual(sampleChallenge);
  });

  it('handles fetchChallenges.rejected', () => {
    const state = challengeReducer(initial, {
      type: fetchChallenges.rejected.type,
      error: { message: 'Network error fetching challenges' },
    });

    expect(state.status).toBe('failed');
    expect(state.error).toBe('Network error fetching challenges');
  });

  it('clears challenge error via clearChallengeError action', () => {
    const errorState = {
      ...initial,
      status: 'failed' as const,
      error: 'Something went wrong',
    };

    const nextState = challengeReducer(errorState, clearChallengeError());
    expect(nextState.error).toBeNull();
  });

  it('selects challenges via entity adapter selectors', () => {
    const rootState: any = {
      challenges: {
        ids: ['ch-1'],
        entities: { 'ch-1': sampleChallenge },
        status: 'succeeded',
        error: null,
      },
    };

    expect(selectAllChallenges(rootState)).toEqual([sampleChallenge]);
    expect(selectChallengeById(rootState, 'ch-1')).toEqual(sampleChallenge);
    expect(selectChallengeById(rootState, 'ch-unknown')).toBeUndefined();
  });
});
