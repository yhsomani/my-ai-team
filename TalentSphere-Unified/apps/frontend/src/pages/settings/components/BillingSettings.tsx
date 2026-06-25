import React from 'react';
import Card from '../../../components/shared/GlassCard';
import { Button } from '../../../components/shared/AuraButton';
import { Badge } from '../../../components/shared/Badge';
import { ArrowUpRight, CreditCard } from 'lucide-react';
import { BillingInfo } from '../../../services/settingsService';

interface BillingSettingsProps {
  billing: BillingInfo | null;
  onOpenBilling: () => void;
}

const formatBillingDate = (date?: string) => {
  if (!date) return 'Not scheduled';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const BillingSettings: React.FC<BillingSettingsProps> = ({ billing, onOpenBilling }) => {
  const billingHistoryCount = billing?.billing_history?.length || 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Billing Summary</h3>
            <p className="text-slate-400 mt-1">Plan changes and payment methods are managed from Billing.</p>
          </div>
          <Badge variant={billing?.subscription_status === 'ACTIVE' ? 'success' : 'default'}>
            {billing?.subscription_status || 'Free Tier'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Current plan</p>
            <p className="mt-2 text-lg font-semibold text-white">{billing?.current_plan || 'Talent Free'}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Next billing date</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatBillingDate(billing?.next_billing_date)}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">History</p>
            <p className="mt-2 text-lg font-semibold text-white">{billingHistoryCount} {billingHistoryCount === 1 ? 'invoice' : 'invoices'}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-white/5 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-white">{billing?.payment_method || 'No payment method on file'}</p>
              <p className="text-sm text-slate-400">Open Billing to review plans, invoices, and provider payment settings.</p>
            </div>
          </div>
          <Button variant="outline" onClick={onOpenBilling}>
            Open Billing <ArrowUpRight size={14} className="ml-1.5" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
