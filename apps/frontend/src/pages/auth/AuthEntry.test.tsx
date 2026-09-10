import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../../services/authService';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    resetPassword: vi.fn(),
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

const expectDecorativeSvgIcons = (container: Element) => {
  const icons = Array.from(container.querySelectorAll('svg'));

  expect(icons.length).toBeGreaterThan(0);
  icons.forEach(icon => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('Auth entry error copy', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('exposes the login entry with named shell, form, and alternate entry semantics', () => {
    renderWithRouter(<LoginPage />);

    expect(screen.getByRole('main', { name: 'Sign in to TalentSphere' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Sign in to TalentSphere authentication panel' })).toBeTruthy();

    const form = screen.getByRole('form', { name: 'Email sign in' });
    expect(within(form).getByLabelText('Email')).toBeTruthy();
    expect(within(form).getByLabelText('Password')).toBeTruthy();
    expect(within(form).getByRole('button', { name: /sign in/i })).toBeTruthy();

    const alternateEntry = screen.getByRole('navigation', { name: 'Authentication alternate entry' });
    expect(within(alternateEntry).getByRole('link', { name: 'Sign up' })).toBeTruthy();
    expectDecorativeSvgIcons(document.body);
  });

  it('exposes the registration entry with named shell, form, account type, and next-step semantics', () => {
    renderWithRouter(<RegisterPage />, '/register?role=recruiter');

    expect(screen.getByRole('main', { name: 'Create your account' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Create your account authentication panel' })).toBeTruthy();

    const form = screen.getByRole('form', { name: 'Account registration' });
    const accountType = within(form).getByRole('group', { name: 'Account Type' });
    const recruiterOption = within(accountType).getByRole('button', { name: /Recruiter/ });
    const talentOption = within(accountType).getByRole('button', { name: /Talent/ });
    const nextStep = within(form).getByRole('status', { name: 'Registration next step' });

    expect(recruiterOption.getAttribute('aria-pressed')).toBe('true');
    expect(recruiterOption.getAttribute('aria-controls')).toBe('registration-next-step');
    expect(nextStep.textContent).toContain('Next: company setup');

    fireEvent.click(talentOption);

    expect(talentOption.getAttribute('aria-pressed')).toBe('true');
    expect(nextStep.textContent).toContain('Next: dashboard checklist');

    const alternateEntry = screen.getByRole('navigation', { name: 'Authentication alternate entry' });
    expect(within(alternateEntry).getByRole('link', { name: 'Sign in' })).toBeTruthy();
    expectDecorativeSvgIcons(document.body);
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

  it('offers locked-out users a recovery entry point and requests a reset link', async () => {
    vi.mocked(authService.resetPassword).mockResolvedValueOnce(undefined);

    renderWithRouter(<LoginPage />);

    fireEvent.click(screen.getByTestId('forgot-password-link'));

    const form = screen.getByRole('form', { name: 'Password reset request' });
    fireEvent.change(within(form).getByLabelText('Email'), {
      target: { value: 'lockedout@example.com' },
    });
    fireEvent.click(within(form).getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(authService.resetPassword).toHaveBeenCalledWith('lockedout@example.com');
    });

    const status = await screen.findByTestId('forgot-success');
    expect(status.textContent).toContain('If an account exists for that email');

    fireEvent.click(screen.getByTestId('forgot-back'));
    expect(screen.getByRole('form', { name: 'Email sign in' })).toBeTruthy();
  });

  it('prefills the forgot-password email from the sign-in form', () => {
    renderWithRouter(<LoginPage />);

    fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'carryme@example.com' } });
    fireEvent.click(screen.getByTestId('forgot-password-link'));

    const form = screen.getByRole('form', { name: 'Password reset request' });
    expect((within(form).getByLabelText('Email') as HTMLInputElement).value).toBe('carryme@example.com');
  });

  it('keeps reset-request failures safe without exposing provider details', async () => {
    vi.mocked(authService.resetPassword).mockRejectedValueOnce(
      new Error('Supabase reset failed with service_role_token=secret'),
    );

    renderWithRouter(<LoginPage />);

    fireEvent.click(screen.getByTestId('forgot-password-link'));
    fireEvent.change(screen.getByTestId('forgot-email-input'), { target: { value: 'lockedout@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('could not send a reset link');
    expect(alert.textContent).not.toMatch(/service_role_token/i);
    expect(alert.textContent).not.toMatch(/Supabase reset failed/i);
  });
});
