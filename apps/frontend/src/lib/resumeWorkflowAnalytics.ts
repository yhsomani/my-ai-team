import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';

export type ResumeWorkflowAnalyticsAction =
  | 'resume_loaded'
  | 'resume_load_failed'
  | 'resume_tab_selected'
  | 'resume_import_opened'
  | 'resume_import_cancelled'
  | 'resume_import_file_loaded'
  | 'resume_import_file_unsupported'
  | 'resume_import_file_failed'
  | 'resume_import_analyzed'
  | 'resume_import_analysis_failed'
  | 'resume_import_apply_failed'
  | 'resume_import_draft_applied'
  | 'resume_import_skills_validation_failed'
  | 'resume_import_skills_saved'
  | 'resume_import_skills_partial'
  | 'resume_import_skills_failed'
  | 'resume_import_rows_validation_failed'
  | 'resume_import_rows_saved'
  | 'resume_import_rows_partial'
  | 'resume_import_rows_failed'
  | 'resume_ai_draft_review_opened'
  | 'resume_ai_draft_review_failed'
  | 'resume_ai_draft_discarded'
  | 'resume_saved'
  | 'resume_save_failed'
  | 'resume_export_completed'
  | 'resume_export_blocked'
  | 'resume_export_failed'
  | 'resume_export_history_loaded'
  | 'resume_export_history_load_failed'
  | 'resume_export_history_sync_failed'
  | 'resume_artifact_library_loaded'
  | 'resume_artifact_library_load_failed'
  | 'resume_artifact_sync_failed'
  | 'resume_artifact_link_copied'
  | 'resume_artifact_link_copy_failed'
  | 'resume_artifact_delete_review_opened'
  | 'resume_artifact_delete_cancelled'
  | 'resume_artifact_deleted'
  | 'resume_artifact_delete_failed';

export type ResumeWorkflowSourceType = 'manual_import' | 'file_import' | 'ai_draft';
export type ResumeWorkflowExportMethod = 'browser-print' | 'html-download' | 'native-pdf' | 'provider-pdf';

interface ResumeWorkflowAnalyticsInput {
  userId?: string | null;
  action: ResumeWorkflowAnalyticsAction;
  entryPoint?: string;
  tabId?: string;
  sourceType?: ResumeWorkflowSourceType;
  fieldKeys?: string[];
  fieldCount?: number;
  selectedFieldCount?: number;
  detectedFieldCount?: number;
  detectedSkillCount?: number;
  selectedSkillCount?: number;
  savedSkillCount?: number;
  failedSkillCount?: number;
  detectedExperienceCount?: number;
  selectedExperienceCount?: number;
  savedExperienceCount?: number;
  failedExperienceCount?: number;
  detectedEducationCount?: number;
  selectedEducationCount?: number;
  savedEducationCount?: number;
  failedEducationCount?: number;
  aiFieldCount?: number;
  profileSkillCount?: number;
  experienceCount?: number;
  educationCount?: number;
  exportHistoryCount?: number;
  artifactCount?: number;
  exportMethod?: ResumeWorkflowExportMethod;
  exportStatus?: 'ready' | 'blocked' | 'failed';
  persistedTo?: 'server' | 'local';
  inputLength?: number;
  fileType?: string;
  unsupportedFileType?: boolean;
  errorCategory?: string;
}

const getEventName = (action: ResumeWorkflowAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'resume_tab_selected':
    case 'resume_import_file_loaded':
      return 'preference_updated';
    case 'resume_import_draft_applied':
      return 'workflow_prefill_used';
    case 'resume_export_history_sync_failed':
    case 'resume_artifact_sync_failed':
      return 'degraded_state_shown';
    case 'resume_artifact_library_loaded':
    case 'resume_artifact_link_copied':
    case 'resume_artifact_deleted':
    case 'resume_loaded':
    case 'resume_import_analyzed':
    case 'resume_import_skills_saved':
    case 'resume_import_rows_saved':
    case 'resume_saved':
    case 'resume_export_completed':
    case 'resume_export_history_loaded':
      return 'task_completed';
    case 'resume_import_cancelled':
    case 'resume_ai_draft_discarded':
    case 'resume_artifact_delete_cancelled':
      return 'task_abandoned';
    case 'resume_load_failed':
    case 'resume_import_file_unsupported':
    case 'resume_import_file_failed':
    case 'resume_import_analysis_failed':
    case 'resume_import_apply_failed':
    case 'resume_import_skills_validation_failed':
    case 'resume_import_skills_partial':
    case 'resume_import_skills_failed':
    case 'resume_import_rows_validation_failed':
    case 'resume_import_rows_partial':
    case 'resume_import_rows_failed':
    case 'resume_ai_draft_review_failed':
    case 'resume_save_failed':
    case 'resume_export_blocked':
    case 'resume_export_failed':
    case 'resume_export_history_load_failed':
    case 'resume_artifact_library_load_failed':
    case 'resume_artifact_link_copy_failed':
    case 'resume_artifact_delete_failed':
      return 'task_failed';
    case 'resume_import_opened':
    case 'resume_ai_draft_review_opened':
    default:
      return 'task_started';
  }
};

const getObjectType = (action: ResumeWorkflowAnalyticsAction) => {
  switch (action) {
    case 'resume_tab_selected':
      return 'resume_tab';
    case 'resume_import_opened':
    case 'resume_import_cancelled':
    case 'resume_import_file_loaded':
    case 'resume_import_file_unsupported':
    case 'resume_import_file_failed':
    case 'resume_import_analyzed':
    case 'resume_import_analysis_failed':
    case 'resume_import_apply_failed':
    case 'resume_import_draft_applied':
      return 'resume_import';
    case 'resume_import_skills_validation_failed':
    case 'resume_import_skills_saved':
    case 'resume_import_skills_partial':
    case 'resume_import_skills_failed':
      return 'resume_profile_skills';
    case 'resume_import_rows_validation_failed':
    case 'resume_import_rows_saved':
    case 'resume_import_rows_partial':
    case 'resume_import_rows_failed':
      return 'resume_profile_rows';
    case 'resume_ai_draft_review_opened':
    case 'resume_ai_draft_review_failed':
    case 'resume_ai_draft_discarded':
      return 'resume_ai_draft';
    case 'resume_saved':
    case 'resume_save_failed':
      return 'resume_profile_fields';
    case 'resume_export_completed':
    case 'resume_export_blocked':
    case 'resume_export_failed':
      return 'resume_export';
    case 'resume_export_history_loaded':
    case 'resume_export_history_load_failed':
    case 'resume_export_history_sync_failed':
      return 'resume_export_history';
    case 'resume_artifact_library_loaded':
    case 'resume_artifact_library_load_failed':
    case 'resume_artifact_sync_failed':
    case 'resume_artifact_link_copied':
    case 'resume_artifact_link_copy_failed':
    case 'resume_artifact_delete_review_opened':
    case 'resume_artifact_delete_cancelled':
    case 'resume_artifact_deleted':
    case 'resume_artifact_delete_failed':
      return 'resume_artifacts';
    case 'resume_loaded':
    case 'resume_load_failed':
    default:
      return 'resume';
  }
};

const safeFieldKeys = (fieldKeys?: string[]) => (
  Array.isArray(fieldKeys)
    ? fieldKeys.filter((field): field is string => typeof field === 'string' && field.trim().length > 0).slice(0, 8)
    : undefined
);

const getInputLengthBand = (inputLength?: number) => {
  if (inputLength === undefined || !Number.isFinite(inputLength)) return undefined;
  if (inputLength <= 0) return 'empty';
  if (inputLength < 1000) return 'short';
  if (inputLength < 5000) return 'medium';
  return 'long';
};

const normalizeFileType = (fileType?: string) => {
  if (!fileType) return undefined;
  const lower = fileType.toLowerCase();
  if (lower.includes('wordprocessingml') || lower.includes('docx')) return 'docx';
  if (lower.includes('pdf')) return 'pdf';
  if (lower.includes('markdown') || lower.endsWith('.md')) return 'markdown';
  if (lower.includes('plain') || lower.includes('text') || lower.endsWith('.txt')) return 'text';
  return 'unsupported';
};

const getUserControl = (action: ResumeWorkflowAnalyticsAction) => (
  action === 'resume_loaded' ||
  action === 'resume_load_failed' ||
  action === 'resume_export_history_loaded' ||
  action === 'resume_export_history_load_failed' ||
  action === 'resume_export_history_sync_failed' ||
  action === 'resume_artifact_library_loaded' ||
  action === 'resume_artifact_library_load_failed' ||
  action === 'resume_artifact_sync_failed'
    ? 'observed'
    : 'explicit'
);

export const recordResumeWorkflowAnalytics = ({
  userId,
  action,
  entryPoint,
  tabId,
  sourceType,
  fieldKeys,
  fieldCount,
  selectedFieldCount,
  detectedFieldCount,
  detectedSkillCount,
  selectedSkillCount,
  savedSkillCount,
  failedSkillCount,
  detectedExperienceCount,
  selectedExperienceCount,
  savedExperienceCount,
  failedExperienceCount,
  detectedEducationCount,
  selectedEducationCount,
  savedEducationCount,
  failedEducationCount,
  aiFieldCount,
  profileSkillCount,
  experienceCount,
  educationCount,
  exportHistoryCount,
  artifactCount,
  exportMethod,
  exportStatus,
  persistedTo,
  inputLength,
  fileType,
  unsupportedFileType,
  errorCategory,
}: ResumeWorkflowAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'resume',
    eventName: getEventName(action),
    source: 'resume_builder',
    objectType: getObjectType(action),
    objectId: tabId || exportMethod || sourceType || undefined,
    metadata: {
      action,
      entryPoint,
      tabId,
      sourceType,
      fieldKeys: safeFieldKeys(fieldKeys),
      fieldCount,
      selectedFieldCount,
      detectedFieldCount,
      detectedSkillCount,
      selectedSkillCount,
      savedSkillCount,
      failedSkillCount,
      detectedExperienceCount,
      selectedExperienceCount,
      savedExperienceCount,
      failedExperienceCount,
      detectedEducationCount,
      selectedEducationCount,
      savedEducationCount,
      failedEducationCount,
      aiFieldCount,
      profileSkillCount,
      experienceCount,
      educationCount,
      exportHistoryCount,
      artifactCount,
      exportMethod,
      exportStatus,
      persistedTo,
      inputLengthBand: getInputLengthBand(inputLength),
      fileType: normalizeFileType(fileType),
      unsupportedFileType,
      errorCategory,
      userControl: getUserControl(action),
      mutationScope: 'resume_workflow',
    },
  });
};
