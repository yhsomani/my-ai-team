import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import { authService } from '../../services/authService';
import { settingsService, type BillingInfo, type NotificationSettings } from '../../services/settingsService';
import authReducer from '../../store/slices/authSlice';
import SettingsPage from './SettingsPage';

vi.mock('../../services/settingsService', () => ({
  settingsService: {
    getNotifications: vi.fn(),
    updateNotifications: vi.fn(),
    getBilling: vi.fn(),
    updateProfileSettings: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

vi.mock('../../services/authService', () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

vi.mock('../../lib/settingsWorkflowAnalytics', () => ({
  recordSettingsWorkflowAnalytics: vi.fn(),
}));

const notificationFixture: NotificationSettings = {
  id: 'notification-settings-unit',
  user_id: 'settings-user',
  email_notifications: true,
  push_notifications: false,
  sms_notifications: false,
  job_alerts: true,
  message_notifications: true,
  newsletter: false,
  digest_frequency: 'daily',
  quiet_hours_enabled: false,
  quiet_hours_start: '18:00',
  quiet_hours_end: '09:00',
  updated_at: '2026-06-28T09:00:00.000Z',
};

const billingFixture: BillingInfo = {
  subscription_status: 'ACTIVE',
  current_plan: 'Talent Pro',
  next_billing_date: '2026-08-01T00:00:00.000Z',
  payment_method: 'Visa ending in 4242',
  billing_history: [
    {
      id: 'invoice-unit',
      status: 'PAID',
    },
  ],
};

const renderSettingsPage = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'settings-user',
          email: 'settings-user@example.com',
          full_name: 'Settings User',
          roles: ['ROLE_USER'],
        },
        session: null,
        loading: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/settings']}>
          <SettingsPage />
        </MemoryRouter>
      </ToastProvider>
    </Provider>,
  );

  return store;
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.mocked(settingsService.getNotifications).mockResolvedValue(notificationFixture);
    vi.mocked(settingsService.getBilling).mockResolvedValue(billingFixture);
    vi.mocked(settingsService.updateNotifications).mockResolvedValue(notificationFixture);
    vi.mocked(settingsService.updateProfileSettings).mockResolvedValue({
      profile: {},
      user_profile: null,
    } as Awaited<ReturnType<typeof settingsService.updateProfileSettings>>);
    vi.mocked(settingsService.deleteAccount).mockResolvedValue(undefined);
    vi.mocked(authService.resetPassword).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('shows safe settings load failure copy without exposing raw provider errors', async () => {
    vi.mocked(settingsService.getNotifications).mockRejectedValue(
      new Error('PostgREST notification settings failed with service_role_token=secret'),
    );
    vi.mocked(settingsService.getBilling).mockRejectedValue(
      new Error('Billing provider failed with stripe_secret_key=sk_test_secret'),
    );

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByText('Settings data could not fully load')).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByText(/notification preferences and billing summary did not respond/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry settings' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Personal Information' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/stripe_secret_key/i)).toBeNull();
    expect(screen.queryByText(/PostgREST notification settings failed/i)).toBeNull();
  });

  it('retries the existing settings load workflow from the safe failure state', async () => {
    vi.mocked(settingsService.getNotifications)
      .mockRejectedValueOnce(new Error('PostgREST notification settings failed with service_role_token=secret'))
      .mockResolvedValue(notificationFixture);
    vi.mocked(settingsService.getBilling)
      .mockRejectedValueOnce(new Error('Billing provider failed with stripe_secret_key=sk_test_secret'))
      .mockResolvedValue(billingFixture);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry settings' })).toBeTruthy();
    });

    const notificationRequestsBeforeRetry = vi.mocked(settingsService.getNotifications).mock.calls.length;
    const billingRequestsBeforeRetry = vi.mocked(settingsService.getBilling).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry settings' }));

    await waitFor(() => {
      expect(settingsService.getNotifications).toHaveBeenCalledTimes(notificationRequestsBeforeRetry + 1);
      expect(settingsService.getBilling).toHaveBeenCalledTimes(billingRequestsBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Settings data could not fully load')).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Billing & Plans' }));

    expect(screen.getByText('Talent Pro')).toBeTruthy();
    expect(screen.getByText('Visa ending in 4242')).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/stripe_secret_key/i)).toBeNull();
  });

  it('shows safe profile save failure copy without exposing raw provider errors and keeps save retry available', async () => {
    vi.mocked(settingsService.updateProfileSettings)
      .mockRejectedValueOnce(new Error('Profile provider failed with service_role_token=secret'))
      .mockResolvedValueOnce({
        profile: {},
        user_profile: null,
      } as Awaited<ReturnType<typeof settingsService.updateProfileSettings>>);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Personal Information' })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Professional Headline'), {
      target: { value: 'Accessible systems lead' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.getByText('Profile settings were not saved. Review the fields and try Save Changes again.')).toBeTruthy();
    });

    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Profile provider failed/i)).toBeNull();
    expect(settingsService.updateProfileSettings).toHaveBeenCalledWith('settings-user', expect.objectContaining({
      first_name: 'Settings',
      last_name: 'User',
      headline: 'Accessible systems lead',
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.queryByText('Profile settings were not saved. Review the fields and try Save Changes again.')).toBeNull();
    });
    expect(settingsService.updateProfileSettings).toHaveBeenCalledTimes(2);
  });

  it('shows safe password-reset failure copy and retries from the existing review action', async () => {
    vi.mocked(authService.resetPassword)
      .mockRejectedValueOnce(new Error('Supabase recovery failed with service_role_token=secret'))
      .mockResolvedValueOnce(undefined);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Security' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Security' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Email' }));

    await waitFor(() => {
      expect(screen.getByText('Password reset email could not be sent. Try again from this review.')).toBeTruthy();
    });

    expect(screen.getByRole('dialog', { name: 'Update Password' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Supabase recovery failed/i)).toBeNull();
    expect(authService.resetPassword).toHaveBeenCalledWith('settings-user@example.com');

    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Email' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Update Password' })).toBeNull();
    });
    expect(authService.resetPassword).toHaveBeenCalledTimes(2);
  });

  it('shows safe account deactivation failure copy and retries from the existing confirmation action', async () => {
    vi.mocked(settingsService.deleteAccount)
      .mockRejectedValueOnce(new Error('Profile delete failed with service_role_token=secret'))
      .mockResolvedValueOnce(undefined);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Security' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Security' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate Account' }));
    fireEvent.change(screen.getByLabelText('Confirmation'), {
      target: { value: 'DEACTIVATE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Deactivation' }));

    await waitFor(() => {
      expect(screen.getByText('Account deactivation could not be completed. Confirm the text and try again.')).toBeTruthy();
    });

    expect(screen.getByRole('dialog', { name: 'Deactivate Account' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Profile delete failed/i)).toBeNull();
    expect(settingsService.deleteAccount).toHaveBeenCalledWith('settings-user');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Deactivation' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Deactivate Account' })).toBeNull();
    });
    expect(settingsService.deleteAccount).toHaveBeenCalledTimes(2);
  });
});
