import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';
import type { NotificationDigestFrequency } from './notificationPreferences';

export type SettingsWorkflowAnalyticsAction =
  | 'settings_tab_selected'
  | 'profile_settings_saved'
  | 'profile_settings_save_failed'
  | 'notification_preference_changed'
  | 'notification_settings_saved'
  | 'notification_settings_save_failed'
  | 'billing_handoff_opened'
  | 'password_reset_review_opened'
  | 'password_reset_cancelled'
  | 'password_reset_completed'
  | 'password_reset_failed'
  | 'account_delete_review_opened'
  | 'account_delete_cancelled'
  | 'account_delete_completed'
  | 'account_delete_failed';

interface SettingsWorkflowAnalyticsInput {
  userId?: string | null;
  action: SettingsWorkflowAnalyticsAction;
  tabId?: string;
  preferenceKey?: string;
  enabled?: boolean;
  digestFrequency?: NotificationDigestFrequency | string;
  quietHoursEnabled?: boolean;
  fieldCount?: number;
  channelCount?: number;
  hasBillingRecord?: boolean;
  invoiceCount?: number;
  errorCategory?: string;
}

const getEventName = (action: SettingsWorkflowAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'notification_preference_changed':
      return 'preference_updated';
    case 'billing_handoff_opened':
      return 'automation_handoff_opened';
    case 'profile_settings_saved':
    case 'notification_settings_saved':
    case 'password_reset_completed':
    case 'account_delete_completed':
      return 'task_completed';
    case 'password_reset_cancelled':
    case 'account_delete_cancelled':
      return 'task_abandoned';
    case 'profile_settings_save_failed':
    case 'notification_settings_save_failed':
    case 'password_reset_failed':
    case 'account_delete_failed':
      return 'task_failed';
    case 'settings_tab_selected':
    case 'password_reset_review_opened':
    case 'account_delete_review_opened':
    default:
      return 'task_started';
  }
};

const getObjectType = (action: SettingsWorkflowAnalyticsAction) => {
  switch (action) {
    case 'notification_preference_changed':
    case 'notification_settings_saved':
    case 'notification_settings_save_failed':
      return 'notification_settings';
    case 'billing_handoff_opened':
      return 'billing';
    case 'password_reset_review_opened':
    case 'password_reset_cancelled':
    case 'password_reset_completed':
    case 'password_reset_failed':
      return 'security_password';
    case 'account_delete_review_opened':
    case 'account_delete_cancelled':
    case 'account_delete_completed':
    case 'account_delete_failed':
      return 'security_account';
    case 'profile_settings_saved':
    case 'profile_settings_save_failed':
      return 'profile_settings';
    case 'settings_tab_selected':
    default:
      return 'settings_tab';
  }
};

export const recordSettingsWorkflowAnalytics = ({
  userId,
  action,
  tabId,
  preferenceKey,
  enabled,
  digestFrequency,
  quietHoursEnabled,
  fieldCount,
  channelCount,
  hasBillingRecord,
  invoiceCount,
  errorCategory,
}: SettingsWorkflowAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'settings',
    eventName: getEventName(action),
    source: 'settings_page',
    objectType: getObjectType(action),
    objectId: tabId || preferenceKey || undefined,
    metadata: {
      action,
      tabId,
      preferenceKey,
      enabled,
      digestFrequency,
      quietHoursEnabled,
      fieldCount,
      channelCount,
      hasBillingRecord,
      invoiceCount,
      errorCategory,
      userControl: 'explicit',
      mutationScope: 'settings_workflow',
    },
  });
};
