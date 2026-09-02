import { describe, expect, it } from 'vitest';
import networkingReducer, {
  fetchSuggestions,
  profileUpdated,
  selectAllProfiles,
  selectProfileById,
} from './networkingSlice';
import type { PublicProfile } from '../../types/networking';

describe('networkingSlice', () => {
  const initial = {
    ids: [],
    entities: {},
    status: 'idle',
    error: null,
  };

  const sampleProfile: PublicProfile = {
    id: 'prof-1',
    userId: 'user-1',
    fullName: 'Devon Vance',
    headline: 'Principal Distributed Systems Engineer',
    avatarUrl: 'https://example.com/avatar.png',
    location: 'Seattle, WA',
  };

  it('handles initial state', () => {
    expect(networkingReducer(undefined, { type: 'unknown' })).toEqual(initial);
  });

  it('handles fetchSuggestions.pending', () => {
    const state = networkingReducer(initial, { type: fetchSuggestions.pending.type });
    expect(state.status).toBe('loading');
  });

  it('handles fetchSuggestions.fulfilled', () => {
    const payload: PublicProfile[] = [sampleProfile];
    const state = networkingReducer(initial, {
      type: fetchSuggestions.fulfilled.type,
      payload,
    });

    expect(state.status).toBe('succeeded');
    expect(state.ids).toEqual(['prof-1']);
    expect(state.entities['prof-1']).toEqual(sampleProfile);
  });

  it('handles fetchSuggestions.rejected', () => {
    const state = networkingReducer(initial, {
      type: fetchSuggestions.rejected.type,
      error: { message: 'Failed to fetch suggestions' },
    });

    expect(state.status).toBe('failed');
    expect(state.error).toBe('Failed to fetch suggestions');
  });

  it('updates profile via profileUpdated action', () => {
    const populatedState = {
      ids: ['prof-1'],
      entities: { 'prof-1': sampleProfile },
      status: 'succeeded' as const,
      error: null,
    };

    const updateAction = profileUpdated({
      id: 'prof-1',
      changes: {
        headline: 'Staff Infrastructure Architect',
      },
    });

    const nextState = networkingReducer(populatedState, updateAction);
    expect(nextState.entities['prof-1']?.headline).toBe('Staff Infrastructure Architect');
  });

  it('selects profiles using entity adapter selectors', () => {
    const rootState: any = {
      networking: {
        ids: ['prof-1'],
        entities: { 'prof-1': sampleProfile },
        status: 'succeeded',
        error: null,
      },
    };

    expect(selectAllProfiles(rootState)).toEqual([sampleProfile]);
    expect(selectProfileById(rootState, 'prof-1')).toEqual(sampleProfile);
    expect(selectProfileById(rootState, 'prof-none')).toBeUndefined();
  });
});
