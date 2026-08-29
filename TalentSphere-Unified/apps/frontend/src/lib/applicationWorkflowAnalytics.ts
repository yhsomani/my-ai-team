import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';
import type { ApplicationDraftSource } from '../services/applicationService';

export type ApplicationWorkflowAnalyticsAction =
  | 'application_review_opened'
  | 'application_profile_draft_review_opened'
  | 'application_profile_draft_cancelled'
  | 'application_profile_draft_used'
  | 'application_draft_restored'
  | 'application_draft_clear_review_opened'
  | 'application_draft_clear_cancelled'
  | 'application_draft_cleared'
  | 'application_submitted'
  | 'application_submit_failed';

interface ApplicationWorkflowAnalyticsInput {
  userId?: string | null;
  action: ApplicationWorkflowAnalyticsAction;
  jobId?: string | null;
  applicationId?: string | null;
  draftSource?: ApplicationDraftSource | 'manual' | 'unavailable' | 'error';
  hasSavedDraft?: boolean;
  hasResumeUrl?: boolean;
  hasCoverLetter?: boolean;
  errorCategory?: string;
}

const getEventName = (action: ApplicationWorkflowAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'application_review_opened':
    case 'application_profile_draft_review_opened':
    case 'application_draft_clear_review_opened':
      return 'task_started';
    case 'application_profile_draft_cancelled':
    case 'application_draft_clear_cancelled':
      return 'task_abandoned';
    case 'application_profile_draft_used':
    case 'application_draft_restored':
      return 'workflow_prefill_used';
    case 'application_draft_cleared':
      return 'workflow_prefill_rejected';
    case 'application_submitted':
      return 'task_completed';
    case 'application_submit_failed':
      return 'task_failed';
    default:
      return 'task_started';
  }
};

const getObjectType = (action: ApplicationWorkflowAnalyticsAction) => (
  action === 'application_submitted' ? 'application' : 'job'
);

const getObjectId = ({
  action,
  applicationId,
  jobId,
}: Pick<ApplicationWorkflowAnalyticsInput, 'action' | 'applicationId' | 'jobId'>) => (
  action === 'application_submitted'
    ? applicationId || jobId || undefined
    : jobId || applicationId || undefined
);

export const recordApplicationWorkflowAnalytics = ({
  userId,
  action,
  jobId,
  applicationId,
  draftSource,
  hasSavedDraft,
  hasResumeUrl,
  hasCoverLetter,
  errorCategory,
}: ApplicationWorkflowAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'applications',
    eventName: getEventName(action),
    source: 'jobs_application_review',
    objectType: getObjectType(action),
    objectId: getObjectId({ action, applicationId, jobId }),
    metadata: {
      action,
      jobId,
      applicationId,
      draftSource,
      hasSavedDraft,
      hasResumeUrl: Boolean(hasResumeUrl),
      hasCoverLetter: Boolean(hasCoverLetter),
      fieldCount: [hasResumeUrl, hasCoverLetter].filter(Boolean).length,
      errorCategory,
      userControl: 'explicit',
      mutationScope: 'application_review_workflow',
    },
  });
};
