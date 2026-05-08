import React from 'react';
import Card from '../../../components/shared/GlassCard';
import { Button } from '../../../components/shared/AuraButton';
import { Key, Shield } from 'lucide-react';

export const SecuritySettings: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold text-white mb-6">Security Settings</h3>

      <div className="space-y-6">
        <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row gap-4 items-start justify-between">
          <div>
            <h4 className="text-lg font-medium text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-accent" />
              Password
            </h4>
            <p className="text-slate-400 text-sm mt-1">Change your password or enable 2FA</p>
          </div>
          <Button variant="outline">Update Password</Button>
        </div>

        <div className="p-5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row gap-4 items-start justify-between">
          <div>
            <h4 className="text-lg font-medium text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Two-Factor Authentication
            </h4>
            <p className="text-slate-400 text-sm mt-1">Add an extra layer of security to your account</p>
          </div>
          <Button variant="outline">Enable 2FA</Button>
        </div>

        <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row gap-4 items-start justify-between mt-12">
          <div>
            <h4 className="text-lg font-medium text-red-400">Danger Zone</h4>
            <p className="text-red-400/70 text-sm mt-1">Permanently delete your account and all data</p>
          </div>
          <Button className="bg-red-500 hover:bg-red-600 text-white border-none">Delete Account</Button>
        </div>
      </div>
    </Card>
  );
};
