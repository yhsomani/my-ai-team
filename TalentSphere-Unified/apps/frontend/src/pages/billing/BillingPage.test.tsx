import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import { paymentService, type PaymentPlan } from '../../services/paymentService';
import authReducer from '../../store/slices/authSlice';
import BillingPage from './BillingPage';

vi.mock('../../services/paymentService', () => ({
  billingMode: {
    mode: 'demo',
    label: 'Demo billing mode',
    providerBacked: false,
    limitation: 'Provider-backed checkout and webhooks are not verified in this build.',
  },
  paymentService: {
    getPlans: vi.fn(),
    getHistory: vi.fn(),
    getUserSubscription: vi.fn(),
    subscribeToPlan: vi.fn(),
    createSession: vi.fn(),
    createBillingPortalSession: vi.fn(),
  },
}));

vi.mock('../../lib/billingWorkflowAnalytics', () => ({
  recordBillingWorkflowAnalytics: vi.fn(),
}));

const paidPlan: PaymentPlan = {
  id: 'plan-pro',
  name: 'Talent Pro',
  price: 49,
  currency: 'USD',
  interval: 'month',
  features: ['Priority AI reviews', 'Advanced application tracking'],
  is_active: true,
};

const renderBillingPage = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'billing-user',
          email: 'billing-user@example.com',
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
        <BillingPage />
      </ToastProvider>
    </Provider>,
  );

  return store;
};

describe('BillingPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(paymentService.getHistory).mockResolvedValue([]);
    vi.mocked(paymentService.getUserSubscription).mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('shows safe provider-unavailable copy without exposing raw billing errors', async () => {
    vi.mocked(paymentService.getPlans).mockRejectedValue(
      new Error('Stripe secret key sk_live_123 failed with service_role_token=secret'),
    );

    renderBillingPage();

    await waitFor(() => {
      expect(screen.getByText('Billing provider unavailable')).toBeTruthy();
    });

    const alert = screen.getAllByRole('alert').find((candidate) => (
      within(candidate).queryByText('Billing provider unavailable')
    ));
    expect(alert).toBeTruthy();
    if (!alert) return;

    expect(within(alert).getByText(/Billing provider data did not respond/i)).toBeTruthy();
    expect(within(alert).getByText(/current subscription is not changed/i)).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Retry billing data' })).toBeTruthy();
    expect(screen.getByText('Plan catalog unavailable')).toBeTruthy();
    expect(screen.queryByText(/sk_live_123/i)).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Stripe secret key/i)).toBeNull();
  });

  it('retries the existing billing data load workflow from the safe failure state', async () => {
    vi.mocked(paymentService.getPlans)
      .mockRejectedValueOnce(new Error('Stripe provider timeout with service_role_token=secret'))
      .mockResolvedValue([paidPlan]);

    renderBillingPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry billing data' })).toBeTruthy();
    });

    const requestCountBeforeRetry = vi.mocked(paymentService.getPlans).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry billing data' }));

    await waitFor(() => {
      expect(paymentService.getPlans).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Talent Pro' })).toBeTruthy();
    });
    expect(screen.queryByText('Billing provider unavailable')).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe plan checkout failure copy and retries through the existing plan review', async () => {
    vi.mocked(paymentService.getPlans).mockResolvedValue([paidPlan]);
    vi.mocked(paymentService.subscribeToPlan)
      .mockRejectedValueOnce(new Error('Stripe checkout failed with sk_live_123 service_role_token=secret'))
      .mockResolvedValueOnce({ url: 'https://billing.example/checkout/plan-pro' });
    vi.spyOn(window, 'open').mockReturnValue({} as Window);

    renderBillingPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Talent Pro' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Review Plan' }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Review Talent Pro' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      const planDialog = screen.getByRole('dialog', { name: 'Review Talent Pro' });
      expect(within(planDialog).getByRole('alert').textContent).toMatch(/The plan change was not started/i);
    });
    expect(paymentService.subscribeToPlan).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/sk_live_123/i)).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Stripe checkout failed/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(paymentService.subscribeToPlan).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('dialog', { name: 'Review Talent Pro' })).toBeNull();
    });
  });

  it('shows safe billing portal failure copy and retries through the existing portal review', async () => {
    vi.mocked(paymentService.getPlans).mockResolvedValue([paidPlan]);
    vi.mocked(paymentService.createBillingPortalSession)
      .mockRejectedValueOnce(new Error('Stripe billing portal failed with sk_live_123 service_role_token=secret'))
      .mockResolvedValueOnce({ url: 'https://billing.example/portal/billing-user' });
    vi.spyOn(window, 'open').mockReturnValue({} as Window);

    renderBillingPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Update$/ })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Update$/ }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Update Payment Method' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Open Billing Portal/i }));

    await waitFor(() => {
      const portalDialog = screen.getByRole('dialog', { name: 'Update Payment Method' });
      expect(within(portalDialog).getByRole('alert').textContent).toMatch(/billing portal could not be opened/i);
    });
    expect(paymentService.createBillingPortalSession).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/sk_live_123/i)).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Stripe billing portal failed/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Open Billing Portal/i }));

    await waitFor(() => {
      expect(paymentService.createBillingPortalSession).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('dialog', { name: 'Update Payment Method' })).toBeNull();
    });
  });
});
