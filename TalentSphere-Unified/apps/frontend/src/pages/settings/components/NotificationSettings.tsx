import React from 'react';
import Card from '../../../components/shared/GlassCard';
import { Button } from '../../../components/shared/AuraButton';
import { Clock, Mail, Smartphone } from 'lucide-react';
import { NotificationSettings as NotificationSettingsType } from '../../../services/settingsService';
import {
  buildNotificationDeliverySummary,
  normalizeNotificationDigestFrequency,
  normalizeNotificationQuietTime,
  notificationDigestFrequencyOptions,
  type NotificationDigestFrequency,
} from '../../../lib/notificationPreferences';

interface NotificationSettingsProps {
  notifications: NotificationSettingsType | null;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationSettingsType | null>>;
  handleNotificationSave: () => void;
  recordPreferenceChange?: (preferenceKey: string, updates: Partial<NotificationSettingsType>) => void;
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
  recordPreferenceChange,
  loading,
  saving
}) => {
  const updatePreference = (key: NotificationPreferenceKey, checked: boolean) => {
    recordPreferenceChange?.(key, { [key]: checked });
    setNotifications(prev => prev ? { ...prev, [key]: checked } : null);
  };
  const deliverySummary = buildNotificationDeliverySummary(notifications || {});

  const updateDeliveryPreference = (
    updates: Partial<Pick<
      NotificationSettingsType,
      'digest_frequency' | 'quiet_hours_enabled' | 'quiet_hours_start' | 'quiet_hours_end'
    >>
  ) => {
    const changedKey = Object.keys(updates)[0];
    if (changedKey) {
      recordPreferenceChange?.(changedKey, updates);
    }
    setNotifications(prev => prev ? { ...prev, ...updates } : null);
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

          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 mt-8">Delivery Controls</h4>
            <div className="space-y-4">
              <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-slate-400" />
                  <div className="min-w-0 flex-1 space-y-4">
                    <div>
                      <label htmlFor="notification-digest-frequency" className="block font-medium text-white">
                        Digest frequency
                      </label>
                      <p className="mt-1 text-sm text-slate-400">
                        Choose how lower-priority alerts should be grouped when digest delivery is available.
                      </p>
                      <select
                        id="notification-digest-frequency"
                        value={normalizeNotificationDigestFrequency(notifications?.digest_frequency)}
                        onChange={(event) => updateDeliveryPreference({
                          digest_frequency: event.target.value as NotificationDigestFrequency,
                        })}
                        className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                      >
                        {notificationDigestFrequencyOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-slate-500">
                        {notificationDigestFrequencyOptions.find(option => option.value === deliverySummary.digestFrequency)?.description}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/10 p-3">
                      <label htmlFor="quiet-hours-enabled" className="flex items-center justify-between gap-3">
                        <span>
                          <span className="block text-sm font-medium text-white">Quiet hours</span>
                          <span className="mt-1 block text-xs text-slate-400">Hold non-urgent digest delivery during this window.</span>
                        </span>
                        <input
                          id="quiet-hours-enabled"
                          type="checkbox"
                          role="switch"
                          checked={deliverySummary.quietHoursEnabled}
                          onChange={(event) => updateDeliveryPreference({ quiet_hours_enabled: event.target.checked })}
                          className="h-4 w-4 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
                        />
                      </label>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor="quiet-hours-start" className="block text-xs font-medium text-slate-300">Start</label>
                          <input
                            id="quiet-hours-start"
                            type="time"
                            value={normalizeNotificationQuietTime(notifications?.quiet_hours_start, '18:00')}
                            onChange={(event) => updateDeliveryPreference({ quiet_hours_start: event.target.value })}
                            disabled={!deliverySummary.quietHoursEnabled}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:border-accent"
                          />
                        </div>
                        <div>
                          <label htmlFor="quiet-hours-end" className="block text-xs font-medium text-slate-300">End</label>
                          <input
                            id="quiet-hours-end"
                            type="time"
                            value={normalizeNotificationQuietTime(notifications?.quiet_hours_end, '09:00')}
                            onChange={(event) => updateDeliveryPreference({ quiet_hours_end: event.target.value })}
                            disabled={!deliverySummary.quietHoursEnabled}
                            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                      <p role="status" aria-live="polite" className="mt-3 text-xs text-slate-400">
                        Current delivery preference: {deliverySummary.summary}. Saving preferences does not mark notifications read or trigger a digest immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
