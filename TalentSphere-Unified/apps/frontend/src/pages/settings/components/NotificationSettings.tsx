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

const decorativeIconProps = { 'aria-hidden': true, focusable: 'false' as const };

const channelPreferences: NotificationPreference[] = [
  {
    key: 'email_notifications',
    title: 'Email Notifications',
    description: 'Receive updates via email',
    icon: <Mail {...decorativeIconProps} className="h-5 w-5 text-[var(--text-secondary)]" />
  },
  {
    key: 'push_notifications',
    title: 'Push Notifications',
    description: 'Receive push notifications in browser',
    icon: <Smartphone {...decorativeIconProps} className="h-5 w-5 text-[var(--text-secondary)]" />
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
      <div
        key={preference.key}
        role="listitem"
        aria-label={`${preference.title}. ${preference.description}. ${checked ? 'On' : 'Off'}`}
        className="flex items-center justify-between gap-4 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          {preference.icon}
          <div>
            <p id={titleId} className="font-medium text-[var(--text-primary)]">{preference.title}</p>
            <p id={descriptionId} className="text-sm text-[var(--text-secondary)]">{preference.description}</p>
          </div>
        </div>
        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
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
          <span aria-hidden="true" className="peer h-6 w-11 rounded-full border border-[var(--border-default)] bg-[var(--bg-inset)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-[var(--border-default)] after:bg-[var(--bg-primary)] after:transition-transform after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent/40" />
        </label>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <h3 className="mb-6 text-xl font-semibold text-[var(--text-primary)]">Notification Preferences</h3>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-md bg-[var(--bg-secondary)]"></div>)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Communication Channels */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase text-[var(--text-secondary)]">Channels</h4>
            <div className="space-y-4" role="list" aria-label="Notification channels">
              {channelPreferences.map(renderPreference)}
            </div>
          </div>

          {/* Activity Alerts */}
          <div>
            <h4 className="mb-4 mt-8 text-sm font-semibold uppercase text-[var(--text-secondary)]">Activity Alerts</h4>
            <div className="space-y-4" role="list" aria-label="Notification activity alerts">
              {activityPreferences.map(renderPreference)}
            </div>
          </div>

          <div>
            <h4 className="mb-4 mt-8 text-sm font-semibold uppercase text-[var(--text-secondary)]">Delivery Controls</h4>
            <div className="space-y-4" role="list" aria-label="Notification delivery controls">
              <div
                role="listitem"
                aria-label={`Delivery preference: ${deliverySummary.summary}`}
                className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
              >
                <div className="flex items-start gap-3">
                  <Clock {...decorativeIconProps} className="mt-0.5 h-5 w-5 text-[var(--text-secondary)]" />
                  <div className="min-w-0 flex-1 space-y-4">
                    <div>
                      <label htmlFor="notification-digest-frequency" className="block font-medium text-[var(--text-primary)]">
                        Digest frequency
                      </label>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Choose how lower-priority alerts should be grouped when digest delivery is available.
                      </p>
                      <select
                        id="notification-digest-frequency"
                        value={normalizeNotificationDigestFrequency(notifications?.digest_frequency)}
                        onChange={(event) => updateDeliveryPreference({
                          digest_frequency: event.target.value as NotificationDigestFrequency,
                        })}
                        className="mt-3 h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                      >
                        {notificationDigestFrequencyOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        {notificationDigestFrequencyOptions.find(option => option.value === deliverySummary.digestFrequency)?.description}
                      </p>
                    </div>

                    <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)]/60 p-3">
                      <label htmlFor="quiet-hours-enabled" className="flex items-center justify-between gap-3">
                        <span>
                          <span className="block text-sm font-medium text-[var(--text-primary)]">Quiet hours</span>
                          <span className="mt-1 block text-xs text-[var(--text-secondary)]">Hold non-urgent digest delivery during this window.</span>
                        </span>
                        <input
                          id="quiet-hours-enabled"
                          type="checkbox"
                          role="switch"
                          checked={deliverySummary.quietHoursEnabled}
                          onChange={(event) => updateDeliveryPreference({ quiet_hours_enabled: event.target.checked })}
                          className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-primary)] text-accent focus:ring-accent"
                        />
                      </label>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor="quiet-hours-start" className="block text-xs font-medium text-[var(--text-secondary)]">Start</label>
                          <input
                            id="quiet-hours-start"
                            type="time"
                            value={normalizeNotificationQuietTime(notifications?.quiet_hours_start, '18:00')}
                            onChange={(event) => updateDeliveryPreference({ quiet_hours_start: event.target.value })}
                            disabled={!deliverySummary.quietHoursEnabled}
                            className="mt-1 h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                          />
                        </div>
                        <div>
                          <label htmlFor="quiet-hours-end" className="block text-xs font-medium text-[var(--text-secondary)]">End</label>
                          <input
                            id="quiet-hours-end"
                            type="time"
                            value={normalizeNotificationQuietTime(notifications?.quiet_hours_end, '09:00')}
                            onChange={(event) => updateDeliveryPreference({ quiet_hours_end: event.target.value })}
                            disabled={!deliverySummary.quietHoursEnabled}
                            className="mt-1 h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                          />
                        </div>
                      </div>
                      <p role="status" aria-live="polite" className="mt-3 text-xs text-[var(--text-secondary)]">
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
