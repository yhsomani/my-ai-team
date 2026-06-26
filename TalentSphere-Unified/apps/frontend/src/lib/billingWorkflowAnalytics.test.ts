import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordBillingWorkflowAnalytics } from './billingWorkflowAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('billingWorkflowAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records billing load completion as observed overview analytics', () => {
    recordBillingWorkflowAnalytics({
      userId: 'user-1',
      action: 'billing_data_loaded',
      entryPoint: 'page_load',
      planCount: 3,
      transactionCount: 4,
      hasSubscription: true,
      hasPaymentMethod: false,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'billing',
      eventName: 'task_completed',
      source: 'billing_page',
      objectType: 'billing_overview',
      objectId: undefined,
      metadata: {
        action: 'billing_data_loaded',
        entryPoint: 'page_load',
        planId: undefined,
        currentPlanId: undefined,
        planInterval: undefined,
        currency: undefined,
        priceBand: undefined,
        featureCount: undefined,
        planCount: 3,
        transactionCount: 4,
        hasSubscription: true,
        hasPaymentMethod: false,
        providerAction: undefined,
        redirectAvailable: undefined,
        popupOpened: undefined,
        errorCategory: undefined,
        userControl: 'observed',
        mutationScope: 'billing_workflow',
      },
    });
  });

  it('records plan review without plan name, exact price, or feature text', () => {
    recordBillingWorkflowAnalytics({
      action: 'billing_plan_review_opened',
      planId: 'plan-pro',
      currentPlanId: 'plan-free',
      price: 49,
      currency: 'USD',
      planInterval: 'month',
      featureCount: 5,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_started',
      objectType: 'billing_plan',
      objectId: 'plan-pro',
      metadata: expect.objectContaining({
        action: 'billing_plan_review_opened',
        planId: 'plan-pro',
        currentPlanId: 'plan-free',
        priceBand: 'medium',
        currency: 'usd',
        planInterval: 'month',
        featureCount: 5,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        planName: expect.anything(),
        price: expect.anything(),
        features: expect.anything(),
      }),
    }));
  });

  it('records checkout handoff as a provider handoff without provider URL', () => {
    recordBillingWorkflowAnalytics({
      action: 'billing_plan_checkout_opened',
      planId: 'plan-pro',
      providerAction: 'checkout',
      redirectAvailable: true,
      popupOpened: true,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'automation_handoff_opened',
      objectType: 'billing_plan',
      metadata: expect.objectContaining({
        action: 'billing_plan_checkout_opened',
        providerAction: 'checkout',
        redirectAvailable: true,
        popupOpened: true,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        url: expect.anything(),
        checkoutUrl: expect.anything(),
        paymentUrl: expect.anything(),
      }),
    }));
  });

  it('records payment portal popup blocking as a failed payment-method workflow', () => {
    recordBillingWorkflowAnalytics({
      action: 'billing_portal_popup_blocked',
      providerAction: 'billing_portal',
      redirectAvailable: true,
      popupOpened: false,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_failed',
      objectType: 'billing_payment_method',
      metadata: expect.objectContaining({
        action: 'billing_portal_popup_blocked',
        providerAction: 'billing_portal',
        popupOpened: false,
      }),
    }));
  });

  it('records billing failures with error category only', () => {
    recordBillingWorkflowAnalytics({
      action: 'billing_plan_checkout_failed',
      planId: 'plan-pro',
      errorCategory: 'provider_error',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_failed',
      objectType: 'billing_plan',
      metadata: expect.objectContaining({
        action: 'billing_plan_checkout_failed',
        errorCategory: 'provider_error',
      }),
    }));
  });
});
