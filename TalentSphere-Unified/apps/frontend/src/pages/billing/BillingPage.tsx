import React, { useState, useEffect } from 'react';
import { CreditCard, Zap, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { paymentService } from '../../services/paymentService';
import { useAppSelector } from '../../store/hooks';
import { Skeleton } from '../../components/shared/Skeleton';

const BillingPage: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);
  const [plans, setPlans] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [plansData, historyData] = await Promise.all([
                paymentService.getPlans(),
                user ? paymentService.getHistory(user.id) : Promise.resolve([])
            ]);
            setPlans(plansData);
            setHistory(historyData);
        } catch (err) {
            console.error("Billing fetch error:", err);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Manage your subscription and billing details." />

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan: any) => (
          <Card key={plan.name} className={`p-6 flex flex-col ${plan.name === 'Pro' ? 'border-accent ring-1 ring-accent/20' : ''}`}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold">{plan.name}</h3>
                {plan.name === 'Pro' && <Badge>Current</Badge>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold">${plan.price}</span>
                <span className="text-sm text-[var(--text-muted)]">/month</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2.5 mb-6">
              {plan.features.map((f: string) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <CheckCircle2 size={14} className="text-success shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button variant={plan.name === 'Pro' ? 'secondary' : 'default'} className="w-full">
              {plan.name === 'Pro' ? 'Current Plan' : 'Upgrade'}
            </Button>
          </Card>
        ))}
      </div>

      {/* Payment Method */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Payment Method</h3>
          <Button variant="outline" size="sm">Update</Button>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)]">
          <CreditCard size={24} className="text-[var(--text-muted)]" />
          <div>
            <p className="text-sm font-medium">•••• •••• •••• 8412</p>
            <p className="text-xs text-[var(--text-muted)]">Visa · Expires 12/28</p>
          </div>
        </div>
      </Card>

      {/* Transaction History */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold mb-4">Transaction History</h3>
        <div className="divide-y divide-[var(--border-default)]">
          {history.length > 0 ? history.map((tx: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{tx.description || 'Service Payment'}</p>
                <p className="text-xs text-[var(--text-muted)]">{new Date(tx.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`text-sm font-medium ${tx.amount > 0 ? 'text-success' : ''}`}>
                {tx.amount > 0 ? `+$${tx.amount}` : `-$${Math.abs(tx.amount)}`}
              </span>
            </div>
          )) : (
            <div className="py-8 text-center text-sm text-[var(--text-muted)]">No transactions found.</div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default BillingPage;
