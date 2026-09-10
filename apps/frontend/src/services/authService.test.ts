import { beforeEach, describe, expect, it, vi } from 'vitest';
import { typedSupabase } from '../lib/supabaseClient';
import { authService } from './authService';

vi.mock('../lib/supabaseClient', () => ({
  typedSupabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('splits full name and invokes supabase signUp with metadata', async () => {
      const mockResult = { data: { user: { id: 'usr-1' } }, error: null };
      (typedSupabase.auth.signUp as any).mockResolvedValueOnce(mockResult);

      const result = await authService.register('jane.doe@example.com', 'P@ssword123', 'Jane Doe', 'CANDIDATE');

      expect(typedSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'jane.doe@example.com',
        password: 'P@ssword123',
        options: {
          data: {
            role: 'CANDIDATE',
            full_name: 'Jane Doe',
            first_name: 'Jane',
            last_name: 'Doe',
          },
        },
      });
      expect(result).toEqual(mockResult.data);
    });

    it('throws error when signUp fails', async () => {
      const authError = new Error('Email already registered');
      (typedSupabase.auth.signUp as any).mockResolvedValueOnce({ data: null, error: authError });

      await expect(
        authService.register('jane.doe@example.com', 'pass', 'Jane Doe', 'CANDIDATE'),
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('calls signInWithPassword with credentials', async () => {
      const mockResult = { data: { session: { access_token: 'tok-1' } }, error: null };
      (typedSupabase.auth.signInWithPassword as any).mockResolvedValueOnce(mockResult);

      const result = await authService.login('user@example.com', 'secret');

      expect(typedSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret',
      });
      expect(result).toEqual(mockResult.data);
    });

    it('throws error when signInWithPassword returns error', async () => {
      (typedSupabase.auth.signInWithPassword as any).mockResolvedValueOnce({
        data: null,
        error: new Error('Invalid login credentials'),
      });

      await expect(authService.login('user@example.com', 'wrong')).rejects.toThrow(
        'Invalid login credentials',
      );
    });
  });

  describe('logout', () => {
    it('calls signOut and completes successfully', async () => {
      (typedSupabase.auth.signOut as any).mockResolvedValueOnce({ error: null });

      await expect(authService.logout()).resolves.toBeUndefined();
      expect(typedSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('throws error if signOut fails', async () => {
      (typedSupabase.auth.signOut as any).mockResolvedValueOnce({ error: new Error('Network error') });

      await expect(authService.logout()).rejects.toThrow('Network error');
    });
  });

  describe('getCurrentUser', () => {
    it('retrieves user from getUser', async () => {
      const mockUser = { id: 'usr-99', email: 'me@example.com' };
      (typedSupabase.auth.getUser as any).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const user = await authService.getCurrentUser();
      expect(user).toEqual(mockUser);
      expect(typedSupabase.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('retrieves session from getSession', async () => {
      const mockSession = { access_token: 'jwt-token', expires_at: 12345 };
      (typedSupabase.auth.getSession as any).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const session = await authService.getSession();
      expect(session).toEqual(mockSession);
      expect(typedSupabase.auth.getSession).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('calls resetPasswordForEmail with origin redirect URI', async () => {
      (typedSupabase.auth.resetPasswordForEmail as any).mockResolvedValueOnce({ error: null });

      await authService.resetPassword('reset@example.com');

      expect(typedSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('reset@example.com', {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    });

    it('throws error when reset fails', async () => {
      (typedSupabase.auth.resetPasswordForEmail as any).mockResolvedValueOnce({
        error: new Error('User not found'),
      });

      await expect(authService.resetPassword('unknown@example.com')).rejects.toThrow('User not found');
    });
  });

  describe('updateUser', () => {
    it('calls updateUser with provided profile updates', async () => {
      const mockUpdated = { user: { id: 'usr-1', email: 'new@example.com' } };
      (typedSupabase.auth.updateUser as any).mockResolvedValueOnce({
        data: mockUpdated,
        error: null,
      });

      const result = await authService.updateUser({ full_name: 'New Name' });
      expect(typedSupabase.auth.updateUser).toHaveBeenCalledWith({ full_name: 'New Name' });
      expect(result).toEqual(mockUpdated);
    });

    it('throws error when updateUser fails', async () => {
      (typedSupabase.auth.updateUser as any).mockResolvedValueOnce({
        data: null,
        error: new Error('Update failed'),
      });

      await expect(authService.updateUser({ password: '123' })).rejects.toThrow('Update failed');
    });
  });
});
