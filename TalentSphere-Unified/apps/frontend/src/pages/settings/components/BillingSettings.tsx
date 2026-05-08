import React from 'react';
import Card from '../../../components/shared/GlassCard';
import { Button } from '../../../components/shared/AuraButton';
import { Badge } from '../../../components/shared/Badge';
import { CreditCard } from 'lucide-react';
import { BillingInfo } from '../../../services/settingsService';

interface BillingSettingsProps {
  billing: BillingInfo | null;
}

export const BillingSettings: React.FC<BillingSettingsProps> = ({ billing }) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Current Plan</h3>
            <p className="text-slate-400 mt-1">Manage your subscription and billing details</p>
          </div>
          <Badge variant={billing?.subscription_status === 'ACTIVE' ? 'success' : 'default'}>
            {billing?.subscription_status || 'Free Tier'}
          </Badge>
        </div>

        <div className="p-6 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h4 className="text-2xl font-bold text-white mb-2">{billing?.current_plan || 'Talent Free'}</h4>
              <p className="text-slate-300">Basic access to platform features</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white mb-1">$0<span className="text-lg text-slate-400 font-normal">/mo</span></div>
              <Button variant="outline" className="mt-2 text-indigo-300 border-indigo-500/30">Upgrade Plan</Button>
            </div>
          </div>
        </div>

        <h4 className="text-lg font-medium text-white mb-4">Billing History</h4>
        {billing?.billing_history?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-sm">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {billing.billing_history.map((invoice: any, i: number) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-4 text-white">{new Date(invoice.created_at).toLocaleDateString()}</td>
                    <td className="py-4 text-white">${invoice.amount}</td>
                    <td className="py-4"><Badge variant="success">Paid</Badge></td>
                    <td className="py-4"><button className="text-accent hover:underline">Download</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-white/5 rounded-xl border border-white/5">
            <CreditCard className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No billing history available</p>
          </div>
        )}
      </Card>
    </div>
  );
};
