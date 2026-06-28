import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { settingsService, NotificationSettings as NotificationSettingsType, BillingInfo } from '../../services/settingsService';
import {
  AlertTriangle, Bell, CreditCard, RotateCw, User, Shield
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { useToast } from '../../components/shared/Toast';
import {
  recordSettingsWorkflowAnalytics,
  type SettingsWorkflowAnalyticsAction,
} from '../../lib/settingsWorkflowAnalytics';

import {
  ProfileSettings,
  NotificationSettings,
  SecuritySettings,
  BillingSettings
} from './components';

const createDefaultNotificationSettings = (userId: string): NotificationSettingsType => ({
  user_id: userId,
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
  job_alerts: true,
  message_notifications: true,
  newsletter: false,
  digest_frequency: 'immediate',
  quiet_hours_enabled: false,
  quiet_hours_start: '18:00',
  quiet_hours_end: '09:00',
  updated_at: new Date().toISOString()
} as NotificationSettingsType);

const settingsNotificationPreferenceKeys = [
  'email_notifications',
  'push_notifications',
  'job_alerts',
  'message_notifications',
] as const;

const formatSettingsLoadSections = (sections: string[]) => {
  if (sections.length <= 1) return sections[0] || 'Settings data';
  return `${sections.slice(0, -1).join(', ')} and ${sections[sections.length - 1]}`;
};

const getSettingsLoadFailureMessage = (sections: string[]) => (
  `${formatSettingsLoadSections(sections)} did not respond. Retry settings to reload account preferences before saving changes.`
);

const getSettingsWorkflowErrorCategory = (error: unknown, fallback: string) => (
  error instanceof Error ? error.name : fallback
);

const getProfileSettingsFieldCount = (profileData: {
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
}) => (
  [
    profileData.firstName.trim(),
    profileData.lastName.trim(),
    profileData.headline.trim(),
    profileData.location.trim(),
  ].filter(Boolean).length
);

const getEnabledNotificationChannelCount = (notifications?: NotificationSettingsType | null) => (
  notifications
    ? settingsNotificationPreferenceKeys.filter(key => Boolean(notifications[key])).length
    : 0
);

const SettingsPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsLoadError, setSettingsLoadError] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState({
    firstName: user?.full_name?.split(' ')[0] || '',
    lastName: user?.full_name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    headline: '',
    location: ''
  });

  const [notifications, setNotifications] = useState<NotificationSettingsType | null>(null);
  const [billing, setBilling] = useState<BillingInfo | null>(null);

  const recordSettingsAnalytics = (
    action: SettingsWorkflowAnalyticsAction,
    extra: Omit<Parameters<typeof recordSettingsWorkflowAnalytics>[0], 'action' | 'userId'> = {}
  ) => {
    recordSettingsWorkflowAnalytics({
      userId: user?.id,
      action,
      ...extra,
    });
  };

  const loadSettingsData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setSettingsLoadError(null);

    const [notificationResult, billingResult] = await Promise.allSettled([
      settingsService.getNotifications(user.id),
      settingsService.getBilling(user.id),
    ]);

    const failedSections: string[] = [];

    if (notificationResult.status === 'fulfilled') {
      setNotifications({
        ...createDefaultNotificationSettings(user.id),
        ...(notificationResult.value || {}),
      });
    } else {
      failedSections.push('Notification preferences');
      setNotifications(createDefaultNotificationSettings(user.id));
    }

    if (billingResult.status === 'fulfilled' && billingResult.value) {
      setBilling(billingResult.value);
    } else if (billingResult.status === 'rejected') {
      failedSections.push('Billing summary');
    }

    if (failedSections.length > 0) {
      setSettingsLoadError(getSettingsLoadFailureMessage(failedSections));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  const handleProfileSave = async () => {
    if (!user) return;
    setSaving(true);
    setProfileSaveError(null);
    try {
      await settingsService.updateProfileSettings(user.id, {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        headline: profileData.headline,
        location: profileData.location
      });
      addToast({ type: 'success', title: 'Success', message: 'Profile settings saved' });
      recordSettingsAnalytics('profile_settings_saved', {
        fieldCount: getProfileSettingsFieldCount(profileData),
      });
    } catch (err) {
      setProfileSaveError('Profile settings were not saved. Review the fields and try Save Changes again.');
      addToast({ type: 'error', title: 'Error', message: 'Failed to save profile' });
      recordSettingsAnalytics('profile_settings_save_failed', {
        fieldCount: getProfileSettingsFieldCount(profileData),
        errorCategory: getSettingsWorkflowErrorCategory(err, 'profile_settings_save_failed'),
      });
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
      recordSettingsAnalytics('notification_settings_saved', {
        digestFrequency: notifications.digest_frequency,
        quietHoursEnabled: Boolean(notifications.quiet_hours_enabled),
        channelCount: getEnabledNotificationChannelCount(notifications),
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to save preferences' });
      recordSettingsAnalytics('notification_settings_save_failed', {
        digestFrequency: notifications.digest_frequency,
        quietHoursEnabled: Boolean(notifications.quiet_hours_enabled),
        channelCount: getEnabledNotificationChannelCount(notifications),
        errorCategory: getSettingsWorkflowErrorCategory(err, 'notification_settings_save_failed'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTabSelect = (tabId: string) => {
    recordSettingsAnalytics('settings_tab_selected', { tabId });
    setActiveTab(tabId);
  };

  const handleNotificationPreferenceAnalytics = (
    preferenceKey: string,
    updates: Partial<NotificationSettingsType>
  ) => {
    const nextNotifications = {
      ...(notifications || createDefaultNotificationSettings(user?.id || 'anonymous')),
      ...updates,
    };

    recordSettingsAnalytics('notification_preference_changed', {
      preferenceKey,
      enabled: typeof updates[preferenceKey as keyof NotificationSettingsType] === 'boolean'
        ? Boolean(updates[preferenceKey as keyof NotificationSettingsType])
        : undefined,
      digestFrequency: nextNotifications.digest_frequency,
      quietHoursEnabled: Boolean(nextNotifications.quiet_hours_enabled),
      channelCount: getEnabledNotificationChannelCount(nextNotifications),
    });
  };

  const handleOpenBilling = () => {
    recordSettingsAnalytics('billing_handoff_opened', {
      hasBillingRecord: Boolean(billing),
      invoiceCount: billing?.billing_history?.length || 0,
    });
    navigate('/billing');
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: <User className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing & Plans', icon: <CreditCard className="w-4 h-4" /> }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Settings"
        description="Manage account preferences, security actions, and billing handoff."
      />

      {settingsLoadError && (
        <div
          role="alert"
          className="flex flex-col gap-4 rounded-md border border-warning/30 bg-warning-muted p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Settings data could not fully load</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{settingsLoadError}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadSettingsData} disabled={loading}>
            <RotateCw className="h-4 w-4" />
            Retry settings
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-3">
          <Card className="p-2 sticky top-24">
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-accent-muted text-accent'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
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
              profileSaveError={profileSaveError}
              clearProfileSaveError={() => setProfileSaveError(null)}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings
              notifications={notifications}
              setNotifications={setNotifications}
              handleNotificationSave={handleNotificationSave}
              recordPreferenceChange={handleNotificationPreferenceAnalytics}
              loading={loading}
              saving={saving}
            />
          )}

          {activeTab === 'security' && (
            <SecuritySettings
              userId={user?.id}
              userEmail={user?.email}
              recordSettingsAction={recordSettingsAnalytics}
            />
          )}

          {activeTab === 'billing' && (
            <BillingSettings billing={billing} onOpenBilling={handleOpenBilling} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
