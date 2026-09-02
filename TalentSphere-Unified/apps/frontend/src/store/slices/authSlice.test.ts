import { describe, expect, it } from 'vitest';
import authReducer, { setUser, setLoading, logout } from './authSlice';

describe('authSlice', () => {
  const initial = {
    user: null,
    session: null,
    loading: true,
  };

  it('handles initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initial);
  });

  it('sets user and session on setUser action and clears loading', () => {
    const mockUser = {
      id: 'usr-1',
      email: 'alex@example.com',
      full_name: 'Alex Rivera',
      roles: ['CANDIDATE'],
    };
    const mockSession = {
      access_token: 'token-abc',
      token_type: 'bearer',
      user: { id: 'usr-1' },
    } as any;

    const state = authReducer(initial, setUser({ user: mockUser, session: mockSession }));

    expect(state.user).toEqual(mockUser);
    expect(state.session).toEqual(mockSession);
    expect(state.loading).toBe(false);
  });

  it('updates loading flag via setLoading', () => {
    const state1 = authReducer(initial, setLoading(false));
    expect(state1.loading).toBe(false);

    const state2 = authReducer(state1, setLoading(true));
    expect(state2.loading).toBe(true);
  });

  it('clears user and session on logout', () => {
    const activeState = {
      user: { id: 'usr-1', email: 'alex@example.com', roles: ['CANDIDATE'] },
      session: { access_token: 'token-abc' } as any,
      loading: false,
    };

    const state = authReducer(activeState, logout());

    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
  });
});
