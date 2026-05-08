import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { settingsService, NotificationSettings, BillingInfo } from '../../services/settingsService';
import {
  Bell, Lock, CreditCard, User, Globe,
  Shield, Smartphone, Mail, Eye, Key
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Input } from '../../components/shared/AuraInput';
import { Tabs } from '../../components/shared/Tabs';
import { Badge } from '../../components/shared/Badge';
import { useToast } from '../../components/shared/Toast';

const SettingsPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: user?.full_name?.split(' ')[0] || '',
    lastName: user?.full_name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    headline: '',
    location: ''
  });

  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        // Note: the backend api for plans was not updated in settingsService mock replacement.
        // We will fetch available data.
        const [notifData, billingData] = await Promise.all([
          settingsService.getNotifications(user.id).catch(() => null),
          settingsService.getBilling(user.id).catch(() => null)
        ]);

        if (notifData) setNotifications(notifData);
        if (billingData) setBilling(billingData);
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleProfileSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await settingsService.updateProfileSettings(user.id, {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        headline: profileData.headline,
        location: profileData.location
      });
      addToast({ type: 'success', title: 'Success', message: 'Profile settings saved' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSave = async () => {
    if (!user || !notifications) return;
    setSaving(true);
    try {
      await settingsService.updateNotifications(user.id, notifications);
      addToast({ type: 'success', title: 'Success', message: 'Notification preferences saved' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: <User className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing & Plans', icon: <CreditCard className="w-4 h-4" /> }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account preferences and configurations"
      />

      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-3">
          <Card className="p-2 sticky top-24">
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-accent/10 text-accent'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        <div className="md:col-span-9 space-y-6">
          {activeTab === 'profile' && (
            <Card className="p-6">
              <h3 className="text-xl font-bold text-white mb-6">Personal Information</h3>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(p => ({ ...p, firstName: e.target.value }))}
                  />
                  <Input
                    label="Last Name"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(p => ({ ...p, lastName: e.target.value }))}
                  />
                </div>

                <Input
                  label="Email Address"
                  type="email"
                  value={profileData.email}
                  disabled

                />

                <Input
                  label="Professional Headline"
                  value={profileData.headline}
                  onChange={(e) => setProfileData(p => ({ ...p, headline: e.target.value }))}
                  placeholder="e.g. Senior Software Engineer at Tech Corp"
                />

                <Input
                  label="Location"
                  value={profileData.location}
                  onChange={(e) => setProfileData(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. San Francisco, CA"
                />

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handleProfileSave}
                    isLoading={saving}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="p-6">
              <h3 className="text-xl font-bold text-white mb-6">Notification Preferences</h3>

              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[1,2,3,4].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl"></div>)}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Communication Channels */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Channels</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="font-medium text-white">Email Notifications</p>
                            <p className="text-sm text-slate-400">Receive updates via email</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={notifications?.email_notifications || false}
                            onChange={(e) => setNotifications(p => p ? { ...p, email_notifications: e.target.checked } : null)}
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="font-medium text-white">Push Notifications</p>
                            <p className="text-sm text-slate-400">Receive push notifications in browser</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={notifications?.push_notifications || false}
                            onChange={(e) => setNotifications(p => p ? { ...p, push_notifications: e.target.checked } : null)}
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Activity Alerts */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 mt-8">Activity Alerts</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                        <div>
                          <p className="font-medium text-white">Job Alerts</p>
                          <p className="text-sm text-slate-400">New job postings matching your skills</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={notifications?.job_alerts || false}
                            onChange={(e) => setNotifications(p => p ? { ...p, job_alerts: e.target.checked } : null)}
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                        <div>
                          <p className="font-medium text-white">Messages</p>
                          <p className="text-sm text-slate-400">When you receive a new direct message</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={notifications?.message_notifications || false}
                            onChange={(e) => setNotifications(p => p ? { ...p, message_notifications: e.target.checked } : null)}
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button onClick={handleNotificationSave} isLoading={saving}>Save Preferences</Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'security' && (
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
          )}

          {activeTab === 'billing' && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
