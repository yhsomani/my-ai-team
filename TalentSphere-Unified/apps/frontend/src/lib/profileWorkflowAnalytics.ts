import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';

export type ProfileWorkflowAnalyticsAction =
  | 'profile_loaded'
  | 'profile_load_failed'
  | 'profile_tab_selected'
  | 'profile_basic_edit_opened'
  | 'profile_basic_edit_cancelled'
  | 'profile_basic_saved'
  | 'profile_basic_save_failed'
  | 'profile_ai_draft_review_opened'
  | 'profile_ai_draft_review_failed'
  | 'profile_ai_draft_discarded'
  | 'profile_suggestion_applied'
  | 'profile_completion_task_opened'
  | 'profile_completion_task_cancelled'
  | 'profile_completion_task_validation_failed'
  | 'profile_completion_task_saved'
  | 'profile_completion_task_save_failed'
  | 'profile_row_delete_review_opened'
  | 'profile_row_delete_cancelled'
  | 'profile_row_delete_completed'
  | 'profile_row_delete_failed'
  | 'profile_photo_upload_opened'
  | 'profile_photo_upload_review_opened'
  | 'profile_photo_upload_cancelled'
  | 'profile_photo_upload_validation_failed'
  | 'profile_photo_uploaded'
  | 'profile_photo_upload_failed'
  | 'profile_photo_remove_review_opened'
  | 'profile_photo_remove_cancelled'
  | 'profile_photo_removed'
  | 'profile_photo_remove_failed'
  | 'profile_photo_upload_unavailable';

export type ProfileWorkflowRowType = 'skill' | 'experience' | 'education' | 'basic';
export type ProfileWorkflowRowMode = 'create' | 'edit';

interface ProfileWorkflowAnalyticsInput {
  userId?: string | null;
  action: ProfileWorkflowAnalyticsAction;
  viewedProfileScope?: 'own' | 'external';
  entryPoint?: string;
  tabId?: string;
  rowType?: ProfileWorkflowRowType;
  rowMode?: ProfileWorkflowRowMode;
  fieldKeys?: string[];
  fieldCount?: number;
  missingFieldCount?: number;
  skillCount?: number;
  experienceCount?: number;
  educationCount?: number;
  achievementCount?: number;
  completedTaskCount?: number;
  completionPercentage?: number;
  suggestionType?: string;
  suggestionSource?: string;
  aiFieldCount?: number;
  errorCategory?: string;
}

const getEventName = (action: ProfileWorkflowAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'profile_tab_selected':
      return 'preference_updated';
    case 'profile_suggestion_applied':
      return 'workflow_prefill_used';
    case 'profile_photo_upload_unavailable':
      return 'degraded_state_shown';
    case 'profile_loaded':
    case 'profile_basic_saved':
    case 'profile_completion_task_saved':
    case 'profile_row_delete_completed':
    case 'profile_photo_uploaded':
    case 'profile_photo_removed':
      return 'task_completed';
    case 'profile_basic_edit_cancelled':
    case 'profile_ai_draft_discarded':
    case 'profile_completion_task_cancelled':
    case 'profile_row_delete_cancelled':
    case 'profile_photo_upload_cancelled':
    case 'profile_photo_remove_cancelled':
      return 'task_abandoned';
    case 'profile_load_failed':
    case 'profile_basic_save_failed':
    case 'profile_ai_draft_review_failed':
    case 'profile_completion_task_validation_failed':
    case 'profile_completion_task_save_failed':
    case 'profile_row_delete_failed':
    case 'profile_photo_upload_validation_failed':
    case 'profile_photo_upload_failed':
    case 'profile_photo_remove_failed':
      return 'task_failed';
    case 'profile_basic_edit_opened':
    case 'profile_ai_draft_review_opened':
    case 'profile_completion_task_opened':
    case 'profile_row_delete_review_opened':
    case 'profile_photo_upload_opened':
    case 'profile_photo_upload_review_opened':
    case 'profile_photo_remove_review_opened':
    default:
      return 'task_started';
  }
};

const getObjectType = (action: ProfileWorkflowAnalyticsAction) => {
  switch (action) {
    case 'profile_tab_selected':
      return 'profile_tab';
    case 'profile_basic_edit_opened':
    case 'profile_basic_edit_cancelled':
    case 'profile_basic_saved':
    case 'profile_basic_save_failed':
      return 'profile_basic_info';
    case 'profile_ai_draft_review_opened':
    case 'profile_ai_draft_review_failed':
    case 'profile_ai_draft_discarded':
      return 'profile_ai_draft';
    case 'profile_suggestion_applied':
      return 'profile_suggestion';
    case 'profile_completion_task_opened':
    case 'profile_completion_task_cancelled':
    case 'profile_completion_task_validation_failed':
    case 'profile_completion_task_saved':
    case 'profile_completion_task_save_failed':
      return 'profile_completion_task';
    case 'profile_row_delete_review_opened':
    case 'profile_row_delete_cancelled':
    case 'profile_row_delete_completed':
    case 'profile_row_delete_failed':
      return 'profile_row';
    case 'profile_photo_upload_opened':
    case 'profile_photo_upload_review_opened':
    case 'profile_photo_upload_cancelled':
    case 'profile_photo_upload_validation_failed':
    case 'profile_photo_uploaded':
    case 'profile_photo_upload_failed':
    case 'profile_photo_remove_review_opened':
    case 'profile_photo_remove_cancelled':
    case 'profile_photo_removed':
    case 'profile_photo_remove_failed':
    case 'profile_photo_upload_unavailable':
      return 'profile_photo';
    case 'profile_loaded':
    case 'profile_load_failed':
    default:
      return 'profile';
  }
};

const safeFieldKeys = (fieldKeys?: string[]) => (
  Array.isArray(fieldKeys)
    ? fieldKeys.filter((field): field is string => typeof field === 'string' && field.trim().length > 0).slice(0, 8)
    : undefined
);

const getCompletionBand = (completionPercentage?: number) => {
  if (completionPercentage === undefined || !Number.isFinite(completionPercentage)) return undefined;
  if (completionPercentage >= 100) return 'complete';
  if (completionPercentage >= 75) return 'high';
  if (completionPercentage >= 50) return 'medium';
  if (completionPercentage > 0) return 'low';
  return 'empty';
};

const normalizeSuggestionSource = (suggestionSource?: string) => {
  if (!suggestionSource) return undefined;
  const normalized = suggestionSource.toLowerCase();
  if (normalized.includes('ai')) return 'ai_assistant';
  if (normalized.includes('profile text')) return 'profile_text';
  if (normalized.includes('skill') && normalized.includes('work')) return 'skills_and_work_history';
  if (normalized.includes('work')) return 'work_history';
  return 'unknown';
};

export const recordProfileWorkflowAnalytics = ({
  userId,
  action,
  viewedProfileScope,
  entryPoint,
  tabId,
  rowType,
  rowMode,
  fieldKeys,
  fieldCount,
  missingFieldCount,
  skillCount,
  experienceCount,
  educationCount,
  achievementCount,
  completedTaskCount,
  completionPercentage,
  suggestionType,
  suggestionSource,
  aiFieldCount,
  errorCategory,
}: ProfileWorkflowAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'profile',
    eventName: getEventName(action),
    source: 'profile_page',
    objectType: getObjectType(action),
    objectId: tabId || rowType || suggestionType || undefined,
    metadata: {
      action,
      viewedProfileScope,
      entryPoint,
      tabId,
      rowType,
      rowMode,
      fieldKeys: safeFieldKeys(fieldKeys),
      fieldCount,
      missingFieldCount,
      skillCount,
      experienceCount,
      educationCount,
      achievementCount,
      completedTaskCount,
      completionBand: getCompletionBand(completionPercentage),
      suggestionType,
      suggestionSource: normalizeSuggestionSource(suggestionSource),
      aiFieldCount,
      errorCategory,
      userControl: action === 'profile_loaded' || action === 'profile_load_failed' ? 'observed' : 'explicit',
      mutationScope: 'profile_workflow',
    },
  });
};
