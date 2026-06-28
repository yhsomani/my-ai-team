import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../../services/authService';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock('../../lib/onboardingAnalytics', () => ({
  recordOnboardingAnalytics: vi.fn(),
}));

const renderWithRouter = (children: React.ReactNode, initialEntry = '/login') => {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      {children}
    </MemoryRouter>,
  );
};

describe('Auth entry error copy', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps login provider failures safe without exposing raw provider details', async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(
      new Error('Supabase auth provider failed with service_role_token=secret'),
    );

    renderWithRouter(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'candidate@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('We could not sign you in right now. Check your email and password, then try again.');
    expect(alert.textContent).not.toMatch(/service_role_token/i);
    expect(alert.textContent).not.toMatch(/Supabase auth provider failed/i);
    expect(authService.login).toHaveBeenCalledWith('candidate@example.com', 'wrongpassword');
  });

  it('preserves the configured invalid-credential login copy', async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(new Error('Invalid login credentials'));

    renderWithRouter(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'candidate@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Invalid login credentials');
    });
  });

  it('keeps registration provider failures safe while preserving role selection context', async () => {
    vi.mocked(authService.register).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Postgres signup adapter failed with service_role_token=secret',
        },
      },
    });

    renderWithRouter(<RegisterPage />, '/register?role=recruiter');

    expect(screen.getByRole('button', { name: /Recruiter/ }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Recruiter User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'recruiter@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('We could not create your account right now. Check your details, then try again.');
    expect(alert.textContent).not.toMatch(/service_role_token/i);
    expect(alert.textContent).not.toMatch(/Postgres signup adapter failed/i);
    expect(authService.register).toHaveBeenCalledWith(
      'recruiter@example.com',
      'password123',
      'Recruiter User',
      'ROLE_RECRUITER',
    );
  });

  it('maps weak registration password failures to user-actionable copy', async () => {
    vi.mocked(authService.register).mockRejectedValueOnce(new Error('Password should be at least 8 characters'));

    renderWithRouter(<RegisterPage />);

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Talent User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'talent@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Use a password with at least 8 characters.');
    });
  });
});
