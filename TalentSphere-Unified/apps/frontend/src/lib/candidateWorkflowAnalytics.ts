import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';
import type {
  CandidateBulkStatusTarget,
  CandidateReviewFocus,
} from './candidateInterviewPlanner';

export type CandidateWorkflowAnalyticsAction =
  | 'candidate_review_focus_applied'
  | 'candidate_details_opened'
  | 'candidate_review_queue_opened'
  | 'candidate_status_review_opened'
  | 'candidate_status_completed'
  | 'candidate_status_failed'
  | 'candidate_bulk_status_reviewed'
  | 'candidate_bulk_status_confirmed'
  | 'candidate_bulk_status_failed'
  | 'candidate_interview_plan_inserted'
  | 'candidate_scorecard_saved'
  | 'candidate_scorecard_summary_added_to_notes'
  | 'candidate_review_reset_review_opened'
  | 'candidate_review_reset_cancelled'
  | 'candidate_review_reset_confirmed';

export type CandidateWorkflowAnalyticsEntryPoint = 'row' | 'queue_first' | 'queue_previous' | 'queue_next' | 'focus_action' | 'modal';

interface CandidateWorkflowAnalyticsInput {
  userId?: string | null;
  action: CandidateWorkflowAnalyticsAction;
  applicationId?: string | null;
  jobId?: string | null;
  targetStatus?: CandidateBulkStatusTarget | string | null;
  previousStatus?: string | null;
  reviewFocus?: CandidateReviewFocus;
  entryPoint?: CandidateWorkflowAnalyticsEntryPoint;
  visibleCount?: number;
  selectedCount?: number;
  eligibleCount?: number;
  skippedCount?: number;
  succeededCount?: number;
  failedCount?: number;
  hasScorecard?: boolean;
  hasRecruiterNote?: boolean;
  hasUnsavedNote?: boolean;
  hasUnsavedScorecard?: boolean;
  advisoryScore?: number | null;
  scorecardSource?: 'server' | 'local' | 'none';
  errorCategory?: string;
}

const getEventName = (action: CandidateWorkflowAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'candidate_review_focus_applied':
      return 'preference_updated';
    case 'candidate_bulk_status_reviewed':
      return 'bulk_action_reviewed';
    case 'candidate_bulk_status_confirmed':
      return 'bulk_action_confirmed';
    case 'candidate_status_completed':
    case 'candidate_scorecard_saved':
    case 'candidate_review_reset_confirmed':
      return 'task_completed';
    case 'candidate_status_failed':
    case 'candidate_bulk_status_failed':
      return 'task_failed';
    case 'candidate_interview_plan_inserted':
    case 'candidate_scorecard_summary_added_to_notes':
      return 'workflow_prefill_used';
    case 'candidate_review_reset_cancelled':
      return 'task_abandoned';
    case 'candidate_details_opened':
    case 'candidate_review_queue_opened':
    case 'candidate_status_review_opened':
    case 'candidate_review_reset_review_opened':
    default:
      return 'task_started';
  }
};

const getObjectType = (action: CandidateWorkflowAnalyticsAction) => {
  switch (action) {
    case 'candidate_bulk_status_reviewed':
    case 'candidate_bulk_status_confirmed':
    case 'candidate_bulk_status_failed':
      return 'candidate_selection';
    case 'candidate_scorecard_saved':
      return 'candidate_scorecard';
    default:
      return 'application';
  }
};

const getScoreBand = (score?: number | null) => {
  if (score === null || score === undefined || !Number.isFinite(score)) return undefined;
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

export const recordCandidateWorkflowAnalytics = ({
  userId,
  action,
  applicationId,
  jobId,
  targetStatus,
  previousStatus,
  reviewFocus,
  entryPoint,
  visibleCount,
  selectedCount,
  eligibleCount,
  skippedCount,
  succeededCount,
  failedCount,
  hasScorecard,
  hasRecruiterNote,
  hasUnsavedNote,
  hasUnsavedScorecard,
  advisoryScore,
  scorecardSource,
  errorCategory,
}: CandidateWorkflowAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'candidates',
    eventName: getEventName(action),
    source: 'candidate_pipeline',
    objectType: getObjectType(action),
    objectId: applicationId || undefined,
    metadata: {
      action,
      applicationId,
      jobId,
      targetStatus,
      previousStatus,
      reviewFocus,
      entryPoint,
      visibleCount,
      selectedCount,
      eligibleCount,
      skippedCount,
      succeededCount,
      failedCount,
      hasScorecard,
      hasRecruiterNote,
      hasUnsavedNote,
      hasUnsavedScorecard,
      advisoryScoreBand: getScoreBand(advisoryScore),
      scorecardSource,
      errorCategory,
      userControl: 'explicit',
      mutationScope: 'candidate_review_workflow',
    },
  });
};
