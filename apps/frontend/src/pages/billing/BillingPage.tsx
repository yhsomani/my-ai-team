import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CreditCard, CheckCircle2, ArrowUpRight, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { SourceStatusBadge } from '../../components/shared/SourceStatusBadge';
import { EmptyState } from '../../components/shared/EmptyState';
import { billingMode, Payment, PaymentPlan, paymentService } from '../../services/paymentService';
import { useAppSelector } from '../../store/hooks';
import { Skeleton } from '../../components/shared/Skeleton';
import { AuraModal } from '../../components/shared/AuraModal';
import { useToast } from '../../components/shared/Toast';
import {
  recordBillingWorkflowAnalytics,
  type BillingWorkflowAnalyticsAction,
} from '../../lib/billingWorkflowAnalytics';

const getActionUrl = (response: any) => {
  return response?.url || response?.checkoutUrl || response?.paymentUrl || response?.data?.url || response?.data?.paymentUrl;
};

const formatCurrency = (amount: number, currency = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2
  }).format(amount);
};

const getBillingErrorCategory = (error: unknown, fallback = 'request_error') => {
  if (!error) return fallback;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('auth') || message.includes('login') || message.includes('sign in')) return 'auth_required';
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) return 'network_error';
  if (message.includes('stripe') || message.includes('checkout') || message.includes('portal') || message.includes('subscription')) {
    return 'provider_error';
  }
  return fallback;
};

const billingInsetClassName = 'rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)]';
const billingDescriptionClassName = 'text-sm text-[var(--text-secondary)]';
const billingMutedClassName = 'text-xs text-[var(--text-muted)]';
const billingSectionTitleClassName = 'text-sm font-semibold';
const billingLoadFailureMessage = 'Billing provider data did not respond. Retry to reload plans, payment method, subscription status, and transaction history.';
const billingPlanActionFailureMessage = 'The plan change was not started. No subscription state changed. Review the plan and try again from this confirmation.';
const billingPortalActionFailureMessage = 'The billing portal could not be opened. No payment method changed. Review the handoff and try again from this confirmation.';
const decorativeIconProps = { 'aria-hidden': true, focusable: 'false' as const };

const getPaymentStatusBadgeVariant = (status: Payment['status']): 'success' | 'warning' | 'destructive' | 'outline' => {
  if (status === 'COMPLETED') return 'success';
  if (status === 'FAILED') return 'destructive';
  if (status === 'REFUNDED') return 'outline';
  return 'warning';
};

const getPlanName = (plan: PaymentPlan) => plan.name || 'Billing plan';

const getPlanComparisonLabel = (plan: PaymentPlan, isCurrent: boolean) => {
  const planName = getPlanName(plan);
  const currency = plan.currency || 'usd';
  const interval = plan.interval || 'month';
  const featureCount = plan.features.length;
  const featureLabel = `${featureCount} ${featureCount === 1 ? 'feature' : 'features'}`;
  const stateLabel = isCurrent ? 'Current plan' : 'Available plan';
  return `${stateLabel}: ${planName}. ${formatCurrency(plan.price, currency)} per ${interval}. ${featureLabel}.`;
};

const getBillingPaymentMethodLabel = (paymentMethod?: string | null) => (
  `Payment method: ${paymentMethod || 'No payment method on file'}`
);

const getBillingTransactionLabel = (transaction: Payment) => {
  const createdAt = transaction.created_at || (transaction as any).createdAt;
  const dateLabel = createdAt ? new Date(createdAt).toLocaleDateString() : 'Date unavailable';
  const amountLabel = transaction.amount > 0
    ? `+${formatCurrency(transaction.amount, transaction.currency)}`
    : `-${formatCurrency(Math.abs(transaction.amount), transaction.currency)}`;

  return `${transaction.description || 'Service Payment'}. ${dateLabel}. ${transaction.status}. ${amountLabel}`;
};

const BillingPage: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);
  const { addToast } = useToast();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [history, setHistory] = useState<Payment[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingLoadError, setBillingLoadError] = useState<string | null>(null);
  const [billingPlanActionError, setBillingPlanActionError] = useState<string | null>(null);
  const [billingPortalActionError, setBillingPortalActionError] = useState<string | null>(null);

  const userId = user?.id;

  const recordBillingAction = useCallback((
    action: BillingWorkflowAnalyticsAction,
    extra: Omit<Parameters<typeof recordBillingWorkflowAnalytics>[0], 'action' | 'userId'> = {}
  ) => {
    recordBillingWorkflowAnalytics({
      userId,
      action,
      ...extra,
    });
  }, [userId]);

  const loadBillingData = useCallback(async (entryPoint = 'page_load') => {
    try {
      setLoading(true);
      setBillingLoadError(null);
      const [plansData, historyData, subscriptionData] = await Promise.all([
        paymentService.getPlans(),
        userId ? paymentService.getHistory(userId) : Promise.resolve([]),
        userId ? paymentService.getUserSubscription(userId).catch(() => null) : Promise.resolve(null)
      ]);
      setPlans(plansData);
      setHistory(historyData);
      setSubscription(subscriptionData);
      recordBillingAction('billing_data_loaded', {
        entryPoint,
        currentPlanId: subscriptionData?.plan_id || subscriptionData?.planId || null,
        planCount: plansData.length,
        transactionCount: historyData.length,
        hasSubscription: Boolean(subscriptionData),
        hasPaymentMethod: Boolean(subscriptionData?.payment_method || subscriptionData?.paymentMethod),
      });
    } catch (err) {
      console.error("Billing fetch error:", err);
      setPlans([]);
      setHistory([]);
      setSubscription(null);
      setBillingLoadError(billingLoadFailureMessage);
      recordBillingAction('billing_data_load_failed', {
        entryPoint,
        errorCategory: getBillingErrorCategory(err, 'billing_load_failed'),
      });
      addToast({ type: 'error', title: 'Billing unavailable', message: 'Could not load billing details.' });
    } finally {
      setLoading(false);
    }
  }, [addToast, recordBillingAction, userId]);

  useEffect(() => {
    void loadBillingData();
  }, [loadBillingData]);

  const currentPlanName = subscription?.subscription_plans?.name || subscription?.plan?.name || 'Free';
  const paymentMethod = subscription?.payment_method || subscription?.paymentMethod;

  const planByCurrentSubscription = useMemo(() => {
    return plans.find((plan) => plan.name?.toLowerCase() === currentPlanName?.toLowerCase()) || null;
  }, [currentPlanName, plans]);

  const currentPlanId = subscription?.plan_id || subscription?.planId || planByCurrentSubscription?.id || null;

  const getBillingOverviewAnalyticsContext = useCallback((entryPoint?: string) => ({
    entryPoint,
    currentPlanId,
    planCount: plans.length,
    transactionCount: history.length,
    hasSubscription: Boolean(subscription),
    hasPaymentMethod: Boolean(paymentMethod),
  }), [currentPlanId, history.length, paymentMethod, plans.length, subscription]);

  const getPlanAnalyticsContext = useCallback((plan: PaymentPlan, entryPoint?: string) => ({
    ...getBillingOverviewAnalyticsContext(entryPoint),
    planId: plan.id || null,
    planInterval: plan.interval || 'month',
    currency: plan.currency || 'usd',
    price: plan.price,
    featureCount: plan.features.length,
  }), [getBillingOverviewAnalyticsContext]);

  const handleRetryBillingData = useCallback((entryPoint: string) => {
    recordBillingAction('billing_retry_clicked', getBillingOverviewAnalyticsContext(entryPoint));
    void loadBillingData(entryPoint);
  }, [getBillingOverviewAnalyticsContext, loadBillingData, recordBillingAction]);

  const handleChoosePlan = (plan: PaymentPlan) => {
    if (!user) {
      recordBillingAction('billing_plan_review_failed', {
        ...getPlanAnalyticsContext(plan, 'plan_card'),
        errorCategory: 'auth_required',
      });
      addToast({ type: 'warning', title: 'Sign in required', message: 'Please sign in before changing your plan.' });
      return;
    }
    recordBillingAction('billing_plan_review_opened', getPlanAnalyticsContext(plan, 'plan_card'));
    setBillingPlanActionError(null);
    setSelectedPlan(plan);
    setIsPlanModalOpen(true);
  };

  const handleClosePlanReview = () => {
    if (isProcessing) return;
    if (selectedPlan) {
      recordBillingAction('billing_plan_review_cancelled', getPlanAnalyticsContext(selectedPlan, 'review_modal'));
    }
    setBillingPlanActionError(null);
    setIsPlanModalOpen(false);
  };

  const handleOpenPaymentMethodReview = () => {
    if (!user) {
      recordBillingAction('billing_portal_failed', {
        ...getBillingOverviewAnalyticsContext('payment_method_card'),
        providerAction: 'billing_portal',
        errorCategory: 'auth_required',
      });
      addToast({ type: 'warning', title: 'Sign in required', message: 'Please sign in before updating your payment method.' });
      return;
    }
    recordBillingAction('billing_payment_method_review_opened', getBillingOverviewAnalyticsContext('payment_method_card'));
    setBillingPortalActionError(null);
    setIsPaymentMethodModalOpen(true);
  };

  const handleClosePaymentMethodReview = () => {
    if (isProcessing) return;
    recordBillingAction('billing_payment_method_review_cancelled', getBillingOverviewAnalyticsContext('review_modal'));
    setBillingPortalActionError(null);
    setIsPaymentMethodModalOpen(false);
  };

  const openUrl = (url?: string) => {
    if (!url) return false;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    return Boolean(opened);
  };

  const handleConfirmPlan = async () => {
    if (!user || !selectedPlan) return;
    const planAnalyticsContext = getPlanAnalyticsContext(selectedPlan, 'review_modal');
    recordBillingAction('billing_plan_checkout_started', {
      ...planAnalyticsContext,
      providerAction: 'checkout',
    });
    setIsProcessing(true);
    setBillingPlanActionError(null);
    try {
      const currency = selectedPlan.currency || 'usd';
      let response: any;

      if (selectedPlan.id) {
        response = await paymentService.subscribeToPlan(user.id, selectedPlan.id);
      } else {
        response = await paymentService.createSession(
          user.id,
          selectedPlan.price,
          currency,
          `${selectedPlan.name} subscription`
        );
      }

      const actionUrl = getActionUrl(response);
      if (actionUrl) {
        const opened = openUrl(actionUrl);
        recordBillingAction(opened ? 'billing_plan_checkout_opened' : 'billing_plan_checkout_popup_blocked', {
          ...planAnalyticsContext,
          providerAction: 'checkout',
          redirectAvailable: true,
          popupOpened: opened,
        });
        addToast({
          type: opened ? 'success' : 'warning',
          title: opened ? 'Checkout opened' : 'Popup blocked',
          message: opened ? 'Review and confirm the plan change in Stripe.' : 'Allow popups, then try again.'
        });
      } else {
        recordBillingAction('billing_plan_change_requested', {
          ...planAnalyticsContext,
          providerAction: 'checkout',
          redirectAvailable: false,
          popupOpened: false,
        });
        addToast({
          type: 'success',
          title: 'Plan request submitted',
          message: 'Your subscription request was sent for processing.'
        });
      }
      setBillingPlanActionError(null);
      setIsPlanModalOpen(false);
    } catch (err) {
      console.error('Plan change failed:', err);
      recordBillingAction('billing_plan_checkout_failed', {
        ...planAnalyticsContext,
        providerAction: 'checkout',
        errorCategory: getBillingErrorCategory(err, 'plan_checkout_failed'),
      });
      addToast({ type: 'error', title: 'Plan change failed', message: 'Please try again later.' });
      setBillingPlanActionError(billingPlanActionFailureMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    const portalAnalyticsContext = getBillingOverviewAnalyticsContext('review_modal');
    if (!user) {
      recordBillingAction('billing_portal_failed', {
        ...portalAnalyticsContext,
        providerAction: 'billing_portal',
        errorCategory: 'auth_required',
      });
      addToast({ type: 'warning', title: 'Sign in required', message: 'Please sign in before updating your payment method.' });
      return;
    }
    recordBillingAction('billing_portal_started', {
      ...portalAnalyticsContext,
      providerAction: 'billing_portal',
    });
    setIsProcessing(true);
    setBillingPortalActionError(null);
    try {
      const response = await paymentService.createBillingPortalSession(user.id);
      const actionUrl = getActionUrl(response);
      if (actionUrl) {
        const opened = openUrl(actionUrl);
        recordBillingAction(opened ? 'billing_portal_opened' : 'billing_portal_popup_blocked', {
          ...portalAnalyticsContext,
          providerAction: 'billing_portal',
          redirectAvailable: true,
          popupOpened: opened,
        });
        addToast({
          type: opened ? 'success' : 'warning',
          title: opened ? 'Billing portal opened' : 'Popup blocked',
          message: opened ? 'Update your payment method in Stripe.' : 'Allow popups, then try again.'
        });
      } else {
        recordBillingAction('billing_portal_request_submitted', {
          ...portalAnalyticsContext,
          providerAction: 'billing_portal',
          redirectAvailable: false,
          popupOpened: false,
        });
        addToast({
          type: 'success',
          title: 'Payment method request submitted',
          message: 'Your billing portal request was sent for processing.'
        });
      }
      setBillingPortalActionError(null);
      setIsPaymentMethodModalOpen(false);
    } catch (err) {
      console.error('Payment method update failed:', err);
      recordBillingAction('billing_portal_failed', {
        ...portalAnalyticsContext,
        providerAction: 'billing_portal',
        errorCategory: getBillingErrorCategory(err, 'billing_portal_failed'),
      });
      addToast({ type: 'error', title: 'Update failed', message: 'Payment method portal is unavailable right now.' });
      setBillingPortalActionError(billingPortalActionFailureMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Billing" description="Manage your subscription and billing details." />
        <div role="status" aria-label="Loading billing details" className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Billing workspace" className="space-y-6">
      <PageHeader title="Billing" description="Manage your subscription and billing details." />

      {!billingMode.providerBacked && (
        <Card className="border-warning/30 bg-warning-muted/10 p-4" role="status">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <SourceStatusBadge
                  status="demo"
                  label={billingMode.label}
                  description={billingMode.limitation}
                />
                <span className="text-sm font-medium">Provider checkout is not live in this build</span>
              </div>
              <p className={billingDescriptionClassName}>
                {billingMode.limitation} Plan changes remain requests until webhook-owned provider state is implemented.
              </p>
            </div>
          </div>
        </Card>
      )}

      {billingLoadError && (
        <Card className="border-warning/30 bg-warning-muted/10 p-4" role="alert">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertCircle {...decorativeIconProps} size={18} className="text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Billing provider unavailable</p>
                <p className={billingDescriptionClassName}>{billingLoadError} Your current subscription is not changed.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleRetryBillingData('load_error_retry')}>
              Retry billing data
            </Button>
          </div>
        </Card>
      )}

      {/* Plans */}
      <section aria-labelledby="billing-plans-heading" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="billing-plans-heading" className={billingSectionTitleClassName}>Plans</h2>
            <p className={billingDescriptionClassName}>Compare available plans and review a change before any checkout handoff.</p>
          </div>
          {!billingMode.providerBacked && (
            <SourceStatusBadge
              status="demo"
              label="Requests only"
              description="Plan changes remain review requests until provider webhooks own subscription state."
            />
          )}
        </div>
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role={plans.length > 0 ? 'list' : undefined}
          aria-label={plans.length > 0 ? 'Billing plans' : undefined}
        >
          {plans.length > 0 ? plans.map((plan) => {
            const isCurrent = plan.name?.toLowerCase() === currentPlanName?.toLowerCase() ||
              Boolean(plan.id && subscription?.plan_id === plan.id);
            const currency = plan.currency || 'usd';
            const planName = getPlanName(plan);
            return (
              <Card
                key={plan.id || plan.name}
                role="listitem"
                aria-label={getPlanComparisonLabel(plan, isCurrent)}
                className={`flex min-h-[24rem] flex-col p-5 ${isCurrent ? 'border-accent ring-1 ring-accent/20' : ''}`}
              >
                <div className="mb-4">
                  <div className="mb-2 flex min-w-0 items-start justify-between gap-3">
                    <h3 className="min-w-0 break-words text-base font-semibold">{planName}</h3>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                    <span className="text-3xl font-semibold">{formatCurrency(plan.price, currency)}</span>
                    <span className="text-sm text-[var(--text-muted)]">/{plan.interval || 'month'}</span>
                  </div>
                </div>
                <ul className="flex-1 space-y-2.5 mb-6" aria-label={`Features for ${planName}`}>
                  {plan.features.map((f: string) => (
                    <li key={f} className="flex min-w-0 items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <CheckCircle2 {...decorativeIconProps} size={14} className="text-success shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? 'secondary' : 'default'}
                  className="w-full"
                  aria-label={isCurrent ? `Current plan: ${planName}` : `Review ${planName} plan`}
                  onClick={() => handleChoosePlan(plan)}
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Current Plan' : 'Review Plan'}
                </Button>
              </Card>
            );
          }) : (
            <EmptyState
              className="sm:col-span-2 lg:col-span-3"
              icon={<CreditCard {...decorativeIconProps} size={28} />}
              title="Plan catalog unavailable"
              description="Plans could not be loaded from the billing provider. Your current subscription is not changed."
              action={{ label: 'Retry Plans', onClick: () => handleRetryBillingData('plan_catalog_empty') }}
            />
          )}
        </div>
      </section>

      {/* Payment Method */}
      <Card className="p-6" role="region" aria-label="Billing payment method">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={billingSectionTitleClassName}>Payment Method</h2>
            <p className={billingDescriptionClassName}>Payment method updates open in a reviewed provider handoff when live mode is available.</p>
          </div>
          <SourceStatusBadge
            status={billingMode.providerBacked ? 'provider' : 'demo'}
            label={billingMode.providerBacked ? 'Provider backed' : 'Demo source'}
            description={billingMode.providerBacked
              ? 'Payment method updates are handed off to the configured billing provider.'
              : 'Payment method updates are visible for review but are not provider-backed yet.'}
          />
          <Button variant="outline" size="sm" onClick={handleOpenPaymentMethodReview}>
            Update
          </Button>
        </div>
        <div className={`${billingInsetClassName} flex min-w-0 items-start gap-4 p-4`} role="group" aria-label={getBillingPaymentMethodLabel(paymentMethod)}>
          <CreditCard {...decorativeIconProps} size={24} className="text-[var(--text-muted)]" />
          <div className="min-w-0">
            <p className="break-words text-sm font-medium">{paymentMethod || 'No payment method on file'}</p>
            <p className={billingMutedClassName}>
              {billingMode.providerBacked
                ? paymentMethod ? 'Managed through Stripe billing' : 'Add a payment method before activating a paid plan'
                : 'Demo mode: payment method changes are not provider-backed yet'}
            </p>
          </div>
        </div>
      </Card>

      {/* Transaction History */}
      <Card className="p-6" role="region" aria-label="Billing transaction history">
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={billingSectionTitleClassName}>Transaction History</h2>
            <SourceStatusBadge
              status={billingMode.providerBacked ? 'provider' : 'demo'}
              label={billingMode.providerBacked ? 'Provider history' : 'Demo history'}
              description={billingMode.providerBacked
                ? 'Transactions reflect provider-backed billing state.'
                : 'Transactions may include demo billing records and do not prove provider-settled payment state.'}
            />
          </div>
          <p className={billingDescriptionClassName}>History reflects the current billing data source and does not finalize demo checkout requests.</p>
        </div>
        <div
          className="divide-y divide-[var(--border-default)]"
          role={history.length > 0 ? 'list' : undefined}
          aria-label={history.length > 0 ? 'Billing transactions' : undefined}
        >
          {history.length > 0 ? history.map((tx, i) => {
            const createdAt = tx.created_at || (tx as any).createdAt;
            return (
            <div key={tx.id || i} role="listitem" aria-label={getBillingTransactionLabel(tx)} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="break-words text-sm font-medium">{tx.description || 'Service Payment'}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={billingMutedClassName}>{createdAt ? new Date(createdAt).toLocaleDateString() : 'Date unavailable'}</span>
                  <Badge variant={getPaymentStatusBadgeVariant(tx.status)}>{tx.status}</Badge>
                </div>
              </div>
              <span className={`text-sm font-medium ${tx.amount > 0 ? 'text-success' : ''}`}>
                {tx.amount > 0 ? `+${formatCurrency(tx.amount, tx.currency)}` : `-${formatCurrency(Math.abs(tx.amount), tx.currency)}`}
              </span>
            </div>
          );
          }) : (
            <div className="py-8 text-center text-sm text-[var(--text-muted)]">No transactions found.</div>
          )}
        </div>
      </Card>

      <AuraModal
        isOpen={isPlanModalOpen}
        onClose={handleClosePlanReview}
        title={selectedPlan ? `Review ${selectedPlan.name}` : 'Review Plan'}
        size="md"
      >
        {selectedPlan && (
          <div className="space-y-5">
            <div className={`${billingInsetClassName} p-4`}>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{selectedPlan.name}</p>
                  <p className={billingMutedClassName}>Current plan: {planByCurrentSubscription?.name || currentPlanName}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-lg font-semibold">{formatCurrency(selectedPlan.price, selectedPlan.currency)}</p>
                  <p className={billingMutedClassName}>/{selectedPlan.interval || 'month'}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {selectedPlan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 {...decorativeIconProps} size={14} className="text-success shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 rounded-lg border border-warning/20 bg-warning-muted/20 p-4">
              <AlertCircle {...decorativeIconProps} size={18} className="text-warning shrink-0 mt-0.5" />
              <p className={billingDescriptionClassName}>
                {billingMode.providerBacked
                  ? 'You will be redirected to the secure billing provider when checkout is available. No plan change is applied until you confirm it there.'
                  : 'Demo billing mode is active. This request does not finalize subscription state until provider webhooks are implemented.'}
              </p>
            </div>

            {billingPlanActionError && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {billingPlanActionError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={handleClosePlanReview} disabled={isProcessing}>Cancel</Button>
              <Button onClick={handleConfirmPlan} isLoading={isProcessing}>
                <ArrowUpRight {...decorativeIconProps} size={14} />
                Continue
              </Button>
            </div>
          </div>
        )}
      </AuraModal>

      <AuraModal
        isOpen={isPaymentMethodModalOpen}
        onClose={handleClosePaymentMethodReview}
        title="Update Payment Method"
        size="sm"
      >
        <div className="space-y-5">
          <p className={billingDescriptionClassName}>
            {billingMode.providerBacked
              ? 'Payment method changes open in the secure billing provider. Your current card is not changed until you confirm the update there.'
              : 'Payment method updates are disabled as a live provider action in demo billing mode.'}
          </p>
          {billingPortalActionError && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {billingPortalActionError}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleClosePaymentMethodReview} disabled={isProcessing}>Cancel</Button>
            <Button onClick={handleUpdatePaymentMethod} isLoading={isProcessing}>
              <ArrowUpRight {...decorativeIconProps} size={14} />
              Open Billing Portal
            </Button>
          </div>
        </div>
      </AuraModal>
    </div>
  );
};

export default BillingPage;
