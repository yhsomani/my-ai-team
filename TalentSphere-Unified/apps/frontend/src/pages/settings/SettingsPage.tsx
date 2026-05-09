import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { settingsService, NotificationSettings as NotificationSettingsType, BillingInfo } from '../../services/settingsService';
import {
  Bell, CreditCard, User, Shield
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { useToast } from '../../components/shared/Toast';

import {
  ProfileSettings,
  NotificationSettings,
  SecuritySettings,
  BillingSettings
} from './components';

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

  const [notifications, setNotifications] = useState<NotificationSettingsType | null>(null);
  const [billing, setBilling] = useState<BillingInfo | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setLoading(true);


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
            <ProfileSettings
              profileData={profileData}
              setProfileData={setProfileData}
              handleProfileSave={handleProfileSave}
              saving={saving}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings
              notifications={notifications}
              setNotifications={setNotifications}
              handleNotificationSave={handleNotificationSave}
              loading={loading}
              saving={saving}
            />
          )}

          {activeTab === 'security' && (
            <SecuritySettings />
          )}

          {activeTab === 'billing' && (
            <BillingSettings billing={billing} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
