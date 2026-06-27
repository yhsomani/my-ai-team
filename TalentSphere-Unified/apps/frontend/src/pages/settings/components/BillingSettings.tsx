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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Billing Summary</h3>
            <p className="mt-1 text-[var(--text-secondary)]">Plan changes and payment methods are managed from Billing.</p>
          </div>
          <Badge variant={billing?.subscription_status === 'ACTIVE' ? 'success' : 'default'}>
            {billing?.subscription_status || 'Free Tier'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <p className="text-xs font-medium uppercase text-[var(--text-secondary)]">Current plan</p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{billing?.current_plan || 'Talent Free'}</p>
          </div>
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <p className="text-xs font-medium uppercase text-[var(--text-secondary)]">Next billing date</p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{formatBillingDate(billing?.next_billing_date)}</p>
          </div>
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <p className="text-xs font-medium uppercase text-[var(--text-secondary)]">History</p>
            <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{billingHistoryCount} {billingHistoryCount === 1 ? 'invoice' : 'invoices'}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-[var(--text-secondary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{billing?.payment_method || 'No payment method on file'}</p>
              <p className="text-sm text-[var(--text-secondary)]">Open Billing to review plans, invoices, and provider payment settings.</p>
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
