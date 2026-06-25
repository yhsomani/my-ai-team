import React from 'react';
import Card from '../../../components/shared/GlassCard';
import { Button } from '../../../components/shared/AuraButton';
import { Mail, Smartphone } from 'lucide-react';
import { NotificationSettings as NotificationSettingsType } from '../../../services/settingsService';

interface NotificationSettingsProps {
  notifications: NotificationSettingsType | null;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationSettingsType | null>>;
  handleNotificationSave: () => void;
  loading: boolean;
  saving: boolean;
}

type NotificationPreferenceKey = 'email_notifications' | 'push_notifications' | 'job_alerts' | 'message_notifications';

interface NotificationPreference {
  key: NotificationPreferenceKey;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const channelPreferences: NotificationPreference[] = [
  {
    key: 'email_notifications',
    title: 'Email Notifications',
    description: 'Receive updates via email',
    icon: <Mail className="w-5 h-5 text-slate-400" />
  },
  {
    key: 'push_notifications',
    title: 'Push Notifications',
    description: 'Receive push notifications in browser',
    icon: <Smartphone className="w-5 h-5 text-slate-400" />
  }
];

const activityPreferences: NotificationPreference[] = [
  {
    key: 'job_alerts',
    title: 'Job Alerts',
    description: 'New job postings matching your skills'
  },
  {
    key: 'message_notifications',
    title: 'Messages',
    description: 'When you receive a new direct message'
  }
];

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  notifications,
  setNotifications,
  handleNotificationSave,
  loading,
  saving
}) => {
  const updatePreference = (key: NotificationPreferenceKey, checked: boolean) => {
    setNotifications(prev => prev ? { ...prev, [key]: checked } : null);
  };

  const renderPreference = (preference: NotificationPreference) => {
    const checked = Boolean(notifications?.[preference.key]);
    const titleId = `${preference.key}-label`;
    const descriptionId = `${preference.key}-description`;

    return (
      <div key={preference.key} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          {preference.icon}
          <div>
            <p id={titleId} className="font-medium text-white">{preference.title}</p>
            <p id={descriptionId} className="text-sm text-slate-400">{preference.description}</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            role="switch"
            aria-checked={checked}
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="sr-only peer"
            checked={checked}
            onChange={(e) => updatePreference(preference.key, e.target.checked)}
          />
          <span aria-hidden="true" className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
        </label>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold text-white mb-6">Notification Preferences</h3>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl"></div>)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Communication Channels */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Channels</h4>
            <div className="space-y-4">
              {channelPreferences.map(renderPreference)}
            </div>
          </div>

          {/* Activity Alerts */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 mt-8">Activity Alerts</h4>
            <div className="space-y-4">
              {activityPreferences.map(renderPreference)}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleNotificationSave} isLoading={saving}>Save Preferences</Button>
          </div>
        </div>
      )}
    </Card>
  );
};
