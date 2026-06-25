import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CreditCard, CheckCircle2, ArrowUpRight, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { Payment, PaymentPlan, paymentService } from '../../services/paymentService';
import { useAppSelector } from '../../store/hooks';
import { Skeleton } from '../../components/shared/Skeleton';
import { AuraModal } from '../../components/shared/AuraModal';
import { useToast } from '../../components/shared/Toast';

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

  const userId = user?.id;

  const loadBillingData = useCallback(async () => {
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
    } catch (err) {
      console.error("Billing fetch error:", err);
      setPlans([]);
      setHistory([]);
      setSubscription(null);
      setBillingLoadError('Billing provider data is unavailable right now.');
      addToast({ type: 'error', title: 'Billing unavailable', message: 'Could not load billing details.' });
    } finally {
      setLoading(false);
    }
  }, [addToast, userId]);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  const currentPlanName = subscription?.subscription_plans?.name || subscription?.plan?.name || 'Free';
  const paymentMethod = subscription?.payment_method || subscription?.paymentMethod;

  const planByCurrentSubscription = useMemo(() => {
    return plans.find((plan) => plan.name?.toLowerCase() === currentPlanName?.toLowerCase()) || null;
  }, [currentPlanName, plans]);

  const handleChoosePlan = (plan: PaymentPlan) => {
    if (!user) {
      addToast({ type: 'warning', title: 'Sign in required', message: 'Please sign in before changing your plan.' });
      return;
    }
    setSelectedPlan(plan);
    setIsPlanModalOpen(true);
  };

  const openUrl = (url?: string) => {
    if (!url) return false;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    return Boolean(opened);
  };

  const handleConfirmPlan = async () => {
    if (!user || !selectedPlan) return;
    setIsProcessing(true);
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
        addToast({
          type: opened ? 'success' : 'warning',
          title: opened ? 'Checkout opened' : 'Popup blocked',
          message: opened ? 'Review and confirm the plan change in Stripe.' : 'Allow popups, then try again.'
        });
      } else {
        addToast({
          type: 'success',
          title: 'Plan request submitted',
          message: 'Your subscription request was sent for processing.'
        });
      }
      setIsPlanModalOpen(false);
    } catch (err) {
      console.error('Plan change failed:', err);
      addToast({ type: 'error', title: 'Plan change failed', message: 'Please try again later.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const response = await paymentService.createBillingPortalSession(user.id);
      const actionUrl = getActionUrl(response);
      if (actionUrl) {
        const opened = openUrl(actionUrl);
        addToast({
          type: opened ? 'success' : 'warning',
          title: opened ? 'Billing portal opened' : 'Popup blocked',
          message: opened ? 'Update your payment method in Stripe.' : 'Allow popups, then try again.'
        });
      } else {
        addToast({
          type: 'success',
          title: 'Payment method request submitted',
          message: 'Your billing portal request was sent for processing.'
        });
      }
      setIsPaymentMethodModalOpen(false);
    } catch (err) {
      console.error('Payment method update failed:', err);
      addToast({ type: 'error', title: 'Update failed', message: 'Payment method portal is unavailable right now.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Manage your subscription and billing details." />

      {billingLoadError && (
        <Card className="p-4 border-warning/30 bg-warning-muted/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Billing provider unavailable</p>
                <p className="text-sm text-[var(--text-secondary)]">{billingLoadError} You can retry without changing your current subscription.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadBillingData}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.length > 0 ? plans.map((plan) => {
          const isCurrent = plan.name?.toLowerCase() === currentPlanName?.toLowerCase() ||
            Boolean(plan.id && subscription?.plan_id === plan.id);
          const currency = plan.currency || 'usd';
          return (
          <Card key={plan.id || plan.name} className={`p-6 flex flex-col ${isCurrent ? 'border-accent ring-1 ring-accent/20' : ''}`}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold">{plan.name}</h3>
                {isCurrent && <Badge>Current</Badge>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold">{formatCurrency(plan.price, currency)}</span>
                <span className="text-sm text-[var(--text-muted)]">/{plan.interval || 'month'}</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2.5 mb-6">
              {plan.features.map((f: string) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <CheckCircle2 size={14} className="text-success shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button
              variant={isCurrent ? 'secondary' : 'default'}
              className="w-full"
              onClick={() => handleChoosePlan(plan)}
              disabled={isCurrent}
            >
              {isCurrent ? 'Current Plan' : 'Review Plan'}
            </Button>
          </Card>
        );
        }) : (
          <Card className="p-8 text-center md:col-span-3">
            <CreditCard size={28} className="mx-auto mb-3 text-[var(--text-muted)]" />
            <h3 className="text-sm font-semibold">Plan catalog unavailable</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
              Plans could not be loaded from the billing provider. Your current subscription is not changed.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={loadBillingData}>
              Retry Plans
            </Button>
          </Card>
        )}
      </div>

      {/* Payment Method */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Payment Method</h3>
          <Button variant="outline" size="sm" onClick={() => setIsPaymentMethodModalOpen(true)}>
            Update
          </Button>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)]">
          <CreditCard size={24} className="text-[var(--text-muted)]" />
          <div>
            <p className="text-sm font-medium">{paymentMethod || 'No payment method on file'}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {paymentMethod ? 'Managed through Stripe billing' : 'Add a payment method before activating a paid plan'}
            </p>
          </div>
        </div>
      </Card>

      {/* Transaction History */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold mb-4">Transaction History</h3>
        <div className="divide-y divide-[var(--border-default)]">
          {history.length > 0 ? history.map((tx, i) => {
            const createdAt = tx.created_at || (tx as any).createdAt;
            return (
            <div key={tx.id || i} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{tx.description || 'Service Payment'}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {createdAt ? new Date(createdAt).toLocaleDateString() : 'Date unavailable'} · {tx.status}
                </p>
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
        onClose={() => !isProcessing && setIsPlanModalOpen(false)}
        title={selectedPlan ? `Review ${selectedPlan.name}` : 'Review Plan'}
        size="md"
      >
        {selectedPlan && (
          <div className="space-y-5">
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold">{selectedPlan.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">Current plan: {planByCurrentSubscription?.name || currentPlanName}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{formatCurrency(selectedPlan.price, selectedPlan.currency)}</p>
                  <p className="text-xs text-[var(--text-muted)]">/{selectedPlan.interval || 'month'}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {selectedPlan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 size={14} className="text-success shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-warning/20 bg-warning-muted/20 p-4 flex gap-3">
              <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--text-secondary)]">
                You will be redirected to the secure billing provider when checkout is available. No plan change is applied until you confirm it there.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPlanModalOpen(false)} disabled={isProcessing}>Cancel</Button>
              <Button onClick={handleConfirmPlan} isLoading={isProcessing}>
                <ArrowUpRight size={14} />
                Continue
              </Button>
            </div>
          </div>
        )}
      </AuraModal>

      <AuraModal
        isOpen={isPaymentMethodModalOpen}
        onClose={() => !isProcessing && setIsPaymentMethodModalOpen(false)}
        title="Update Payment Method"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-[var(--text-secondary)]">
            Payment method changes open in the secure billing provider. Your current card is not changed until you confirm the update there.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPaymentMethodModalOpen(false)} disabled={isProcessing}>Cancel</Button>
            <Button onClick={handleUpdatePaymentMethod} isLoading={isProcessing}>
              <ArrowUpRight size={14} />
              Open Billing Portal
            </Button>
          </div>
        </div>
      </AuraModal>
    </div>
  );
};

export default BillingPage;
