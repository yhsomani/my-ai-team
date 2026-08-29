import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../../services/authService';
import ResetPasswordPage from './ResetPasswordPage';

vi.mock('../../services/authService', () => ({
  authService: {
    getSession: vi.fn(),
    updateUser: vi.fn(),
    logout: vi.fn(),
  },
}));

const addToast = vi.fn();
vi.mock('../../components/shared/Toast', () => ({
  useToast: () => ({ addToast }),
}));

const renderPage = () => {
  render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div data-testid="login-landing" />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('ResetPasswordPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('verifies the recovery session and shows the new-password form', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({ user: { id: 'u1' } } as never);

    renderPage();

    expect(screen.getByTestId('reset-status').textContent).toContain('Verifying your reset link');

    const form = await screen.findByRole('form', { name: 'Set new password' });
    expect(within(form).getByLabelText('New password')).toBeTruthy();
    expect(within(form).getByLabelText('Confirm new password')).toBeTruthy();
    expect(within(form).getByTestId('reset-submit')).toBeTruthy();
    expect(authService.getSession).toHaveBeenCalled();
  });

  it('rejects short passwords without calling the update API', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({ user: { id: 'u1' } } as never);

    renderPage();

    await screen.findByRole('form', { name: 'Set new password' });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByTestId('reset-submit'));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('at least 8 characters');
    expect(authService.updateUser).not.toHaveBeenCalled();
  });

  it('rejects mismatched confirmation values without calling the update API', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({ user: { id: 'u1' } } as never);

    renderPage();

    await screen.findByRole('form', { name: 'Set new password' });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'longenough1' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'longenough2' } });
    fireEvent.click(screen.getByTestId('reset-submit'));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('do not match');
    expect(authService.updateUser).not.toHaveBeenCalled();
  });

  it('updates the password, ends the session, and returns to sign-in on success', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(authService.updateUser).mockResolvedValue({} as never);
    vi.mocked(authService.logout).mockResolvedValue(undefined);

    renderPage();

    await screen.findByRole('form', { name: 'Set new password' });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpassword1' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpassword1' } });
    fireEvent.click(screen.getByTestId('reset-submit'));

    await waitFor(() => {
      expect(authService.updateUser).toHaveBeenCalledWith({ password: 'newpassword1' });
    });
    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    });
    await waitFor(() => {
      expect(screen.getByTestId('login-landing')).toBeTruthy();
    });
  });

  it('keeps update failures safe and does not end the session', async () => {
    vi.mocked(authService.getSession).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(authService.updateUser).mockRejectedValueOnce(
      new Error('Supabase updateUser failed with service_role_token=secret'),
    );

    renderPage();

    await screen.findByRole('form', { name: 'Set new password' });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpassword1' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'newpassword1' } });
    fireEvent.click(screen.getByTestId('reset-submit'));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('could not update your password');
    expect(alert.textContent).not.toMatch(/service_role_token/i);
    expect(alert.textContent).not.toMatch(/Supabase updateUser failed/i);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('shows the expired-link state when no recovery session can be established', async () => {
    vi.mocked(authService.getSession).mockResolvedValue(null as never);

    renderPage();

    const expired = await screen.findByTestId('reset-expired', {}, { timeout: 3000 });
    expect(expired.textContent).toContain('invalid or has expired');
    expect(screen.queryByRole('form', { name: 'Set new password' })).toBeNull();
  });
});
