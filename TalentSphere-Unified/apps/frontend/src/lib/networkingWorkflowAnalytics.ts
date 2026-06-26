import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';

export type NetworkingWorkflowAnalyticsAction =
  | 'networking_suggestions_loaded'
  | 'networking_suggestions_load_failed'
  | 'networking_connection_state_loaded'
  | 'networking_connection_state_load_failed'
  | 'networking_tab_selected'
  | 'networking_profile_preview_opened'
  | 'networking_full_profile_opened'
  | 'networking_connect_request_sent'
  | 'networking_connect_request_failed'
  | 'networking_incoming_request_accepted'
  | 'networking_incoming_request_accept_failed'
  | 'networking_incoming_request_declined'
  | 'networking_incoming_request_decline_failed'
  | 'networking_sent_request_withdrawn'
  | 'networking_sent_request_withdraw_failed'
  | 'networking_reminder_set'
  | 'networking_reminder_cleared'
  | 'networking_reminder_sync_completed'
  | 'networking_reminder_sync_failed'
  | 'networking_reminders_backfilled'
  | 'networking_reminders_backfill_failed'
  | 'networking_suggestion_hidden'
  | 'networking_hidden_suggestions_restored'
  | 'networking_suggestion_preferences_loaded'
  | 'networking_suggestion_preferences_load_failed'
  | 'networking_suggestion_preference_sync_failed'
  | 'networking_local_state_save_failed';

export type NetworkingWorkflowTab = 'discover' | 'incoming' | 'sent' | 'connections';
export type NetworkingWorkflowRequestDirection = 'discover' | 'incoming' | 'sent' | 'connection';
export type NetworkingWorkflowSyncStatus = 'local' | 'syncing' | 'synced' | 'unavailable';

interface NetworkingWorkflowAnalyticsInput {
  userId?: string | null;
  action: NetworkingWorkflowAnalyticsAction;
  entryPoint?: string;
  tabId?: NetworkingWorkflowTab;
  requestDirection?: NetworkingWorkflowRequestDirection;
  requestStatus?: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'failed';
  visibleSuggestionCount?: number;
  hiddenSuggestionCount?: number;
  incomingRequestCount?: number;
  sentRequestCount?: number;
  connectionCount?: number;
  pendingRequestCount?: number;
  searchLength?: number;
  hasRequestNote?: boolean;
  requestNoteLength?: number;
  recommendationScore?: number;
  mutualConnectionCount?: number;
  reasonCount?: number;
  sharedSkillCount?: number;
  profileSkillCount?: number;
  reminderDelay?: string;
  reminderSyncStatus?: NetworkingWorkflowSyncStatus;
  reminderCount?: number;
  attemptedSyncCount?: number;
  syncedCount?: number;
  failedCount?: number;
  preferenceSyncStatus?: NetworkingWorkflowSyncStatus;
  restoredCount?: number;
  errorCategory?: string;
}

const getEventName = (action: NetworkingWorkflowAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'networking_suggestions_loaded':
      return 'automation_suggestion_generated';
    case 'networking_tab_selected':
    case 'networking_suggestion_hidden':
    case 'networking_hidden_suggestions_restored':
    case 'networking_reminder_set':
    case 'networking_reminder_cleared':
      return 'preference_updated';
    case 'networking_full_profile_opened':
      return 'automation_handoff_opened';
    case 'networking_connection_state_loaded':
    case 'networking_connect_request_sent':
    case 'networking_incoming_request_accepted':
    case 'networking_incoming_request_declined':
    case 'networking_sent_request_withdrawn':
    case 'networking_reminder_sync_completed':
    case 'networking_reminders_backfilled':
    case 'networking_suggestion_preferences_loaded':
      return 'task_completed';
    case 'networking_reminder_sync_failed':
    case 'networking_reminders_backfill_failed':
    case 'networking_suggestion_preferences_load_failed':
    case 'networking_suggestion_preference_sync_failed':
    case 'networking_local_state_save_failed':
      return 'degraded_state_shown';
    case 'networking_suggestions_load_failed':
    case 'networking_connection_state_load_failed':
    case 'networking_connect_request_failed':
    case 'networking_incoming_request_accept_failed':
    case 'networking_incoming_request_decline_failed':
    case 'networking_sent_request_withdraw_failed':
      return 'task_failed';
    case 'networking_profile_preview_opened':
    default:
      return 'task_started';
  }
};

const getObjectType = (action: NetworkingWorkflowAnalyticsAction) => {
  switch (action) {
    case 'networking_suggestions_loaded':
    case 'networking_suggestions_load_failed':
      return 'networking_suggestions';
    case 'networking_tab_selected':
      return 'networking_tab';
    case 'networking_profile_preview_opened':
    case 'networking_full_profile_opened':
      return 'networking_profile_preview';
    case 'networking_connect_request_sent':
    case 'networking_connect_request_failed':
    case 'networking_incoming_request_accepted':
    case 'networking_incoming_request_accept_failed':
    case 'networking_incoming_request_declined':
    case 'networking_incoming_request_decline_failed':
    case 'networking_sent_request_withdrawn':
    case 'networking_sent_request_withdraw_failed':
    case 'networking_connection_state_loaded':
    case 'networking_connection_state_load_failed':
      return 'networking_connection_request';
    case 'networking_reminder_set':
    case 'networking_reminder_cleared':
    case 'networking_reminder_sync_completed':
    case 'networking_reminder_sync_failed':
    case 'networking_reminders_backfilled':
    case 'networking_reminders_backfill_failed':
      return 'networking_reminder';
    case 'networking_suggestion_hidden':
    case 'networking_hidden_suggestions_restored':
    case 'networking_suggestion_preferences_loaded':
    case 'networking_suggestion_preferences_load_failed':
    case 'networking_suggestion_preference_sync_failed':
    case 'networking_local_state_save_failed':
      return 'networking_suggestion_preference';
    default:
      return 'networking';
  }
};

const getObjectId = ({
  tabId,
  requestDirection,
  reminderDelay,
  preferenceSyncStatus,
}: Pick<NetworkingWorkflowAnalyticsInput, 'tabId' | 'requestDirection' | 'reminderDelay' | 'preferenceSyncStatus'>) => (
  tabId || requestDirection || reminderDelay || preferenceSyncStatus || undefined
);

const safeCount = (value?: number) => (
  value === undefined || !Number.isFinite(value) ? undefined : Math.max(0, Math.round(value))
);

const getLengthBand = (value?: number) => {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  if (value <= 0) return 'empty';
  if (value <= 80) return 'short';
  if (value <= 240) return 'medium';
  return 'long';
};

const getScoreBand = (value?: number) => {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  if (value >= 80) return 'high';
  if (value >= 50) return 'medium';
  if (value >= 1) return 'low';
  return 'none';
};

const getMutualConnectionBand = (value?: number) => {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  if (value <= 0) return 'none';
  if (value === 1) return 'one';
  if (value <= 3) return 'few';
  return 'many';
};

const getUserControl = (action: NetworkingWorkflowAnalyticsAction) => (
  action === 'networking_suggestions_loaded' ||
  action === 'networking_suggestions_load_failed' ||
  action === 'networking_connection_state_loaded' ||
  action === 'networking_connection_state_load_failed' ||
  action === 'networking_reminder_sync_completed' ||
  action === 'networking_reminder_sync_failed' ||
  action === 'networking_reminders_backfilled' ||
  action === 'networking_reminders_backfill_failed' ||
  action === 'networking_suggestion_preferences_loaded' ||
  action === 'networking_suggestion_preferences_load_failed' ||
  action === 'networking_suggestion_preference_sync_failed' ||
  action === 'networking_local_state_save_failed'
    ? 'observed'
    : 'explicit'
);

export const recordNetworkingWorkflowAnalytics = ({
  userId,
  action,
  entryPoint,
  tabId,
  requestDirection,
  requestStatus,
  visibleSuggestionCount,
  hiddenSuggestionCount,
  incomingRequestCount,
  sentRequestCount,
  connectionCount,
  pendingRequestCount,
  searchLength,
  hasRequestNote,
  requestNoteLength,
  recommendationScore,
  mutualConnectionCount,
  reasonCount,
  sharedSkillCount,
  profileSkillCount,
  reminderDelay,
  reminderSyncStatus,
  reminderCount,
  attemptedSyncCount,
  syncedCount,
  failedCount,
  preferenceSyncStatus,
  restoredCount,
  errorCategory,
}: NetworkingWorkflowAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'networking',
    eventName: getEventName(action),
    source: 'networking_page',
    objectType: getObjectType(action),
    objectId: getObjectId({ tabId, requestDirection, reminderDelay, preferenceSyncStatus }),
    metadata: {
      action,
      entryPoint,
      tabId,
      requestDirection,
      requestStatus,
      visibleSuggestionCount: safeCount(visibleSuggestionCount),
      hiddenSuggestionCount: safeCount(hiddenSuggestionCount),
      incomingRequestCount: safeCount(incomingRequestCount),
      sentRequestCount: safeCount(sentRequestCount),
      connectionCount: safeCount(connectionCount),
      pendingRequestCount: safeCount(pendingRequestCount),
      searchActive: searchLength !== undefined ? searchLength > 0 : undefined,
      searchLengthBand: getLengthBand(searchLength),
      hasRequestNote,
      requestNoteLengthBand: getLengthBand(requestNoteLength),
      recommendationScoreBand: getScoreBand(recommendationScore),
      mutualConnectionBand: getMutualConnectionBand(mutualConnectionCount),
      reasonCount: safeCount(reasonCount),
      sharedSkillCount: safeCount(sharedSkillCount),
      profileSkillCount: safeCount(profileSkillCount),
      reminderDelay,
      reminderSyncStatus,
      reminderCount: safeCount(reminderCount),
      attemptedSyncCount: safeCount(attemptedSyncCount),
      syncedCount: safeCount(syncedCount),
      failedCount: safeCount(failedCount),
      preferenceSyncStatus,
      restoredCount: safeCount(restoredCount),
      errorCategory,
      userControl: getUserControl(action),
      mutationScope: 'networking_workflow',
    },
  });
};
