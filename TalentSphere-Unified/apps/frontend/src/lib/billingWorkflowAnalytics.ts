import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';

export type BillingWorkflowAnalyticsAction =
  | 'billing_data_loaded'
  | 'billing_data_load_failed'
  | 'billing_retry_clicked'
  | 'billing_plan_review_opened'
  | 'billing_plan_review_cancelled'
  | 'billing_plan_review_failed'
  | 'billing_plan_checkout_started'
  | 'billing_plan_checkout_opened'
  | 'billing_plan_checkout_popup_blocked'
  | 'billing_plan_change_requested'
  | 'billing_plan_checkout_failed'
  | 'billing_payment_method_review_opened'
  | 'billing_payment_method_review_cancelled'
  | 'billing_portal_started'
  | 'billing_portal_opened'
  | 'billing_portal_popup_blocked'
  | 'billing_portal_request_submitted'
  | 'billing_portal_failed';

interface BillingWorkflowAnalyticsInput {
  userId?: string | null;
  action: BillingWorkflowAnalyticsAction;
  entryPoint?: string;
  planId?: string | null;
  currentPlanId?: string | null;
  planInterval?: string | null;
  currency?: string | null;
  price?: number | null;
  featureCount?: number;
  planCount?: number;
  transactionCount?: number;
  hasSubscription?: boolean;
  hasPaymentMethod?: boolean;
  providerAction?: 'checkout' | 'billing_portal';
  redirectAvailable?: boolean;
  popupOpened?: boolean;
  errorCategory?: string;
}

const getEventName = (action: BillingWorkflowAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'billing_retry_clicked':
      return 'error_recovery_clicked';
    case 'billing_plan_checkout_opened':
    case 'billing_portal_opened':
      return 'automation_handoff_opened';
    case 'billing_data_loaded':
    case 'billing_plan_change_requested':
    case 'billing_portal_request_submitted':
      return 'task_completed';
    case 'billing_plan_review_cancelled':
    case 'billing_payment_method_review_cancelled':
      return 'task_abandoned';
    case 'billing_data_load_failed':
    case 'billing_plan_review_failed':
    case 'billing_plan_checkout_popup_blocked':
    case 'billing_plan_checkout_failed':
    case 'billing_portal_popup_blocked':
    case 'billing_portal_failed':
      return 'task_failed';
    case 'billing_plan_review_opened':
    case 'billing_plan_checkout_started':
    case 'billing_payment_method_review_opened':
    case 'billing_portal_started':
    default:
      return 'task_started';
  }
};

const getObjectType = (action: BillingWorkflowAnalyticsAction) => {
  switch (action) {
    case 'billing_data_loaded':
    case 'billing_data_load_failed':
    case 'billing_retry_clicked':
      return 'billing_overview';
    case 'billing_payment_method_review_opened':
    case 'billing_payment_method_review_cancelled':
    case 'billing_portal_started':
    case 'billing_portal_opened':
    case 'billing_portal_popup_blocked':
    case 'billing_portal_request_submitted':
    case 'billing_portal_failed':
      return 'billing_payment_method';
    case 'billing_plan_review_opened':
    case 'billing_plan_review_cancelled':
    case 'billing_plan_review_failed':
    case 'billing_plan_checkout_started':
    case 'billing_plan_checkout_opened':
    case 'billing_plan_checkout_popup_blocked':
    case 'billing_plan_change_requested':
    case 'billing_plan_checkout_failed':
    default:
      return 'billing_plan';
  }
};

const getPriceBand = (price?: number | null) => {
  if (price === null || price === undefined || !Number.isFinite(price)) return undefined;
  if (price <= 0) return 'free';
  if (price < 25) return 'low';
  if (price < 100) return 'medium';
  return 'high';
};

const getUserControl = (action: BillingWorkflowAnalyticsAction) => (
  action === 'billing_data_loaded' || action === 'billing_data_load_failed' ? 'observed' : 'explicit'
);

export const recordBillingWorkflowAnalytics = ({
  userId,
  action,
  entryPoint,
  planId,
  currentPlanId,
  planInterval,
  currency,
  price,
  featureCount,
  planCount,
  transactionCount,
  hasSubscription,
  hasPaymentMethod,
  providerAction,
  redirectAvailable,
  popupOpened,
  errorCategory,
}: BillingWorkflowAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'billing',
    eventName: getEventName(action),
    source: 'billing_page',
    objectType: getObjectType(action),
    objectId: planId || undefined,
    metadata: {
      action,
      entryPoint,
      planId,
      currentPlanId,
      planInterval,
      currency: currency?.toLowerCase(),
      priceBand: getPriceBand(price),
      featureCount,
      planCount,
      transactionCount,
      hasSubscription,
      hasPaymentMethod,
      providerAction,
      redirectAvailable,
      popupOpened,
      errorCategory,
      userControl: getUserControl(action),
      mutationScope: 'billing_workflow',
    },
  });
};
