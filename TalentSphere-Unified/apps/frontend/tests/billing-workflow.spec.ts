import { expect, type Page, test } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

type JsonRecord = Record<string, unknown>;

const userId = 'e2e-role_user';

const freePlan: JsonRecord = {
  id: 'plan-free',
  name: 'Talent Free',
  price: 0,
  currency: 'USD',
  interval: 'month',
  features: ['Profile workspace', 'Basic job tracking'],
  is_active: true,
  created_at: '2026-06-27T09:00:00.000Z',
  updated_at: '2026-06-27T09:00:00.000Z',
};

const proPlan: JsonRecord = {
  id: 'plan-pro',
  name: 'Talent Pro',
  price: 49,
  currency: 'USD',
  interval: 'month',
  features: ['Priority AI reviews', 'Advanced application tracking', 'Exportable reports'],
  is_active: true,
  created_at: '2026-06-27T09:05:00.000Z',
  updated_at: '2026-06-27T09:05:00.000Z',
};

const activeSubscription: JsonRecord = {
  id: 'subscription-free-e2e',
  user_id: userId,
  plan_id: 'plan-free',
  status: 'ACTIVE',
  payment_method: 'Visa ending in 4242',
  next_billing_date: '2026-08-01T00:00:00.000Z',
  created_at: '2026-06-27T09:10:00.000Z',
  subscription_plans: {
    name: 'Talent Free',
    price: 0,
    currency: 'USD',
    interval: 'month',
  },
};

const paymentHistory: JsonRecord[] = [
  {
    id: 'payment-pro-e2e',
    user_id: userId,
    amount: 49,
    currency: 'USD',
    description: 'Talent Pro subscription',
    status: 'COMPLETED',
    payment_method: 'Visa ending in 4242',
    stripe_session_id: 'cs_e2e_completed',
    created_at: '2026-06-27T09:30:00.000Z',
    updated_at: '2026-06-27T09:30:00.000Z',
  },
  {
    id: 'payment-refund-e2e',
    user_id: userId,
    amount: -12,
    currency: 'USD',
    description: 'Plan adjustment credit',
    status: 'REFUNDED',
    payment_method: 'Visa ending in 4242',
    stripe_session_id: 'cs_e2e_refund',
    created_at: '2026-06-26T09:30:00.000Z',
    updated_at: '2026-06-26T09:30:00.000Z',
  },
];

const createCaptures = () => ({
  functionInvokes: [] as Array<{ functionName: string; payload: JsonRecord }>,
  analyticsInserts: [] as JsonRecord[],
});

const getAnalyticsActions = (captures: ReturnType<typeof createCaptures>) => (
  captures.analyticsInserts
    .map(event => event.metadata)
    .filter((metadata): metadata is JsonRecord => Boolean(metadata) && typeof metadata === 'object' && !Array.isArray(metadata))
    .map(metadata => metadata.action)
);

const expectAnalyticsAction = async (
  captures: ReturnType<typeof createCaptures>,
  action: string,
) => {
  await expect.poll(() => getAnalyticsActions(captures).includes(action)).toBeTruthy();
};

const installWindowOpenCapture = async (page: Page, options: { popupBlocked?: boolean } = {}) => {
  await page.addInitScript(({ popupBlocked }) => {
    const testWindow = window as Window & { __billingOpenedUrls?: string[] };
    testWindow.__billingOpenedUrls = [];
    window.open = (url) => {
      testWindow.__billingOpenedUrls?.push(String(url));
      return popupBlocked ? null : ({ closed: false } as Window);
    };
  }, { popupBlocked: Boolean(options.popupBlocked) });
};

const getOpenedUrls = async (page: Page) => (
  page.evaluate(() => {
    const testWindow = window as Window & { __billingOpenedUrls?: string[] };
    return testWindow.__billingOpenedUrls || [];
  })
);

const installBillingWorkflowStubs = async (
  page: Page,
  captures: ReturnType<typeof createCaptures>,
  options: {
    failFirstCheckout?: boolean;
    onSubscriptionPlanRows?: () => JsonRecord[];
  } = {},
) => {
  let checkoutAttempts = 0;

  await installNetworkStubs(page, {
    api: {
      onSupabaseFunctionInvoke: ({ functionName, payload }) => {
        captures.functionInvokes.push({ functionName, payload });

        if (functionName === 'create-subscription') {
          checkoutAttempts += 1;
          if (options.failFirstCheckout && checkoutAttempts === 1) {
            throw new Error('Stripe checkout unavailable');
          }

          return {
            id: 'subscription-session-e2e',
            planId: payload.planId,
            url: `https://billing.example/checkout/${String(payload.planId || 'plan-e2e')}`,
          };
        }

        if (functionName === 'create-billing-portal-session') {
          return {
            id: 'billing-portal-session-e2e',
            url: 'https://billing.example/portal/e2e-role_user',
          };
        }

        return {
          id: 'checkout-session-e2e',
          url: 'https://billing.example/checkout/session-e2e',
        };
      },
    },
    rest: {
      subscriptionPlans: [freePlan, proPlan],
      subscriptions: [activeSubscription],
      payments: paymentHistory,
      notifications: [],
      onSubscriptionPlanRows: options.onSubscriptionPlanRows,
      onProductAnalyticsInsert: (payload) => {
        captures.analyticsInserts.push(payload);
        return {
          id: typeof payload.id === 'string' ? payload.id : 'billing-analytics-e2e',
          occurred_at: typeof payload.occurred_at === 'string' ? payload.occurred_at : '2026-06-27T10:00:00.000Z',
          ...payload,
        };
      },
    },
  });
};

test.describe('Billing workflow', () => {
  test.beforeEach(async ({ page }) => {
    await installE2EAuth(page, [USER_ROLES.user]);
  });

  test('reviews a paid plan, opens checkout and billing portal handoffs, and renders history', async ({ page }) => {
    const captures = createCaptures();
    await installWindowOpenCapture(page);
    await installBillingWorkflowStubs(page, captures);

    await page.goto('/billing');

    await expect(page.getByRole('heading', { name: /^Billing$/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Demo billing mode')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Talent Free' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Talent Pro' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Current plan: Talent Free' })).toBeDisabled();
    await expect(page.getByText('Visa ending in 4242')).toBeVisible();
    await expect(page.getByText('Talent Pro subscription')).toBeVisible();
    await expect(page.getByText('Plan adjustment credit')).toBeVisible();
    await expect(page.getByText('COMPLETED')).toBeVisible();
    await expect(page.getByText('REFUNDED')).toBeVisible();
    await expect(page.getByText('+$49')).toBeVisible();
    await expect(page.getByText('-$12')).toBeVisible();
    await expectAnalyticsAction(captures, 'billing_data_loaded');

    await page.getByRole('button', { name: 'Review Talent Pro plan' }).click();
    const planDialog = page.getByRole('dialog', { name: 'Review Talent Pro' });
    await expect(planDialog).toBeVisible();
    await expect(planDialog.getByText('Current plan: Talent Free')).toBeVisible();
    await expectAnalyticsAction(captures, 'billing_plan_review_opened');

    await planDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(planDialog).toBeHidden();
    await expectAnalyticsAction(captures, 'billing_plan_review_cancelled');

    await page.getByRole('button', { name: 'Review Talent Pro plan' }).click();
    await page.getByRole('dialog', { name: 'Review Talent Pro' }).getByRole('button', { name: /Continue/ }).click();

    await expect(page.getByText('Checkout opened')).toBeVisible();
    await expect.poll(() => captures.functionInvokes.filter(invoke => invoke.functionName === 'create-subscription').length).toBe(1);
    expect(captures.functionInvokes.find(invoke => invoke.functionName === 'create-subscription')?.payload).toEqual({
      userId,
      planId: 'plan-pro',
    });
    await expect.poll(async () => (await getOpenedUrls(page)).includes('https://billing.example/checkout/plan-pro')).toBeTruthy();
    await expectAnalyticsAction(captures, 'billing_plan_checkout_started');
    await expectAnalyticsAction(captures, 'billing_plan_checkout_opened');

    await page.getByRole('button', { name: /^Update$/ }).click();
    const portalDialog = page.getByRole('dialog', { name: 'Update Payment Method' });
    await expect(portalDialog).toBeVisible();
    await expectAnalyticsAction(captures, 'billing_payment_method_review_opened');
    await portalDialog.getByRole('button', { name: /Open Billing Portal/ }).click();

    await expect(page.getByText('Billing portal opened')).toBeVisible();
    await expect.poll(() => captures.functionInvokes.filter(invoke => invoke.functionName === 'create-billing-portal-session').length).toBe(1);
    expect(captures.functionInvokes.find(invoke => invoke.functionName === 'create-billing-portal-session')?.payload).toEqual({
      userId,
    });
    await expect.poll(async () => (await getOpenedUrls(page)).includes('https://billing.example/portal/e2e-role_user')).toBeTruthy();
    await expectAnalyticsAction(captures, 'billing_portal_started');
    await expectAnalyticsAction(captures, 'billing_portal_opened');
  });

  test('keeps plan review open after checkout failure and succeeds on retry', async ({ page }) => {
    const captures = createCaptures();
    await installWindowOpenCapture(page);
    await installBillingWorkflowStubs(page, captures, { failFirstCheckout: true });

    await page.goto('/billing');
    await page.getByRole('button', { name: 'Review Talent Pro plan' }).click();
    const planDialog = page.getByRole('dialog', { name: 'Review Talent Pro' });
    await expect(planDialog).toBeVisible();

    await planDialog.getByRole('button', { name: /Continue/ }).click();
    await expect(page.getByText('Plan change failed')).toBeVisible();
    await expect(planDialog).toBeVisible();
    await expect.poll(() => captures.functionInvokes.filter(invoke => invoke.functionName === 'create-subscription').length).toBe(1);
    await expectAnalyticsAction(captures, 'billing_plan_checkout_failed');

    await planDialog.getByRole('button', { name: /Continue/ }).click();
    await expect(page.getByText('Checkout opened')).toBeVisible();
    await expect(planDialog).toBeHidden();
    await expect.poll(() => captures.functionInvokes.filter(invoke => invoke.functionName === 'create-subscription').length).toBe(2);
    await expectAnalyticsAction(captures, 'billing_plan_checkout_opened');
  });

  test('warns when checkout popup is blocked after reviewed plan confirmation', async ({ page }) => {
    const captures = createCaptures();
    await installWindowOpenCapture(page, { popupBlocked: true });
    await installBillingWorkflowStubs(page, captures);

    await page.goto('/billing');
    await page.getByRole('button', { name: 'Review Talent Pro plan' }).click();
    const planDialog = page.getByRole('dialog', { name: 'Review Talent Pro' });
    await expect(planDialog).toBeVisible();

    await planDialog.getByRole('button', { name: /Continue/ }).click();

    await expect(page.getByText('Popup blocked')).toBeVisible();
    await expect(planDialog).toBeHidden();
    await expect.poll(() => captures.functionInvokes.filter(invoke => invoke.functionName === 'create-subscription').length).toBe(1);
    expect(captures.functionInvokes[0].payload).toEqual({
      userId,
      planId: 'plan-pro',
    });
    await expect.poll(async () => (await getOpenedUrls(page)).includes('https://billing.example/checkout/plan-pro')).toBeTruthy();
    await expectAnalyticsAction(captures, 'billing_plan_checkout_popup_blocked');
  });

  test('shows provider unavailable state and reloads plans on retry without changing subscription state', async ({ page }) => {
    const captures = createCaptures();
    let failPlanLoad = true;
    await installWindowOpenCapture(page);
    await installBillingWorkflowStubs(page, captures, {
      onSubscriptionPlanRows: () => {
        if (failPlanLoad) {
          throw new Error('plan provider unavailable');
        }

        return [freePlan, proPlan];
      },
    });

    await page.goto('/billing');

    const alert = page.getByRole('alert');
    await expect(alert.getByText('Billing provider unavailable')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Plan catalog unavailable')).toBeVisible();
    await expectAnalyticsAction(captures, 'billing_data_load_failed');

    failPlanLoad = false;
    await alert.getByRole('button', { name: 'Retry billing data' }).click();

    await expect(page.getByRole('heading', { name: 'Talent Pro' })).toBeVisible();
    await expect(page.getByText('Billing provider unavailable')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Current plan: Talent Free' })).toBeDisabled();
    await expect(captures.functionInvokes).toEqual([]);
    await expectAnalyticsAction(captures, 'billing_retry_clicked');
    await expectAnalyticsAction(captures, 'billing_data_loaded');
  });
});
