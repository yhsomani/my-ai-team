import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';

export type ChallengeWorkflowAnalyticsAction =
  | 'challenge_category_selected'
  | 'challenge_workspace_opened'
  | 'challenge_language_changed'
  | 'challenge_code_reset_review_opened'
  | 'challenge_code_reset_cancelled'
  | 'challenge_code_reset'
  | 'challenge_history_loaded'
  | 'challenge_history_load_failed'
  | 'challenge_history_retry_clicked'
  | 'challenge_local_check_started'
  | 'challenge_local_check_completed'
  | 'challenge_local_check_failed'
  | 'challenge_submission_completed'
  | 'challenge_submission_failed';

interface ChallengeWorkflowAnalyticsInput {
  userId?: string | null;
  action: ChallengeWorkflowAnalyticsAction;
  challengeId?: string | null;
  category?: string | null;
  difficulty?: string | null;
  language?: string;
  entryPoint?: string;
  visibleChallengeCount?: number;
  sampleCaseCount?: number;
  runnableSampleCaseCount?: number;
  passedSampleCaseCount?: number;
  failedSampleCaseCount?: number;
  errorSampleCaseCount?: number;
  submissionStatus?: string;
  submissionScoreBand?: string;
  attemptCount?: number;
  hasPriorSubmission?: boolean;
  solutionLength?: number;
  errorCategory?: string;
}

const getEventName = (action: ChallengeWorkflowAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'challenge_category_selected':
    case 'challenge_language_changed':
      return 'preference_updated';
    case 'challenge_history_retry_clicked':
      return 'error_recovery_clicked';
    case 'challenge_code_reset_cancelled':
      return 'task_abandoned';
    case 'challenge_history_loaded':
    case 'challenge_local_check_completed':
    case 'challenge_submission_completed':
      return 'task_completed';
    case 'challenge_history_load_failed':
    case 'challenge_local_check_failed':
    case 'challenge_submission_failed':
      return 'task_failed';
    case 'challenge_workspace_opened':
    case 'challenge_code_reset_review_opened':
    case 'challenge_code_reset':
    case 'challenge_local_check_started':
    default:
      return 'task_started';
  }
};

const getObjectType = (action: ChallengeWorkflowAnalyticsAction) => {
  switch (action) {
    case 'challenge_category_selected':
      return 'challenge_filter';
    case 'challenge_language_changed':
    case 'challenge_code_reset_review_opened':
    case 'challenge_code_reset_cancelled':
    case 'challenge_code_reset':
    case 'challenge_local_check_started':
    case 'challenge_local_check_completed':
    case 'challenge_local_check_failed':
      return 'challenge_workspace';
    case 'challenge_history_loaded':
    case 'challenge_history_load_failed':
    case 'challenge_history_retry_clicked':
      return 'challenge_submission_history';
    case 'challenge_submission_completed':
    case 'challenge_submission_failed':
      return 'challenge_submission';
    case 'challenge_workspace_opened':
    default:
      return 'challenge';
  }
};

const getSolutionLengthBand = (solutionLength?: number) => {
  if (solutionLength === undefined || !Number.isFinite(solutionLength)) return undefined;
  if (solutionLength <= 0) return 'empty';
  if (solutionLength < 500) return 'short';
  if (solutionLength < 2500) return 'medium';
  return 'long';
};

const getNormalizedScoreBand = (scoreBand?: string) => {
  if (!scoreBand) return undefined;
  const normalized = scoreBand.toLowerCase();
  if (['high', 'medium', 'low', 'none'].includes(normalized)) return normalized;
  return 'unknown';
};

export const recordChallengeWorkflowAnalytics = ({
  userId,
  action,
  challengeId,
  category,
  difficulty,
  language,
  entryPoint,
  visibleChallengeCount,
  sampleCaseCount,
  runnableSampleCaseCount,
  passedSampleCaseCount,
  failedSampleCaseCount,
  errorSampleCaseCount,
  submissionStatus,
  submissionScoreBand,
  attemptCount,
  hasPriorSubmission,
  solutionLength,
  errorCategory,
}: ChallengeWorkflowAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'challenges',
    eventName: getEventName(action),
    source: 'challenges_page',
    objectType: getObjectType(action),
    objectId: challengeId || category || undefined,
    metadata: {
      action,
      challengeId,
      category,
      difficulty,
      language,
      entryPoint,
      visibleChallengeCount,
      sampleCaseCount,
      runnableSampleCaseCount,
      passedSampleCaseCount,
      failedSampleCaseCount,
      errorSampleCaseCount,
      submissionStatus,
      submissionScoreBand: getNormalizedScoreBand(submissionScoreBand),
      attemptCount,
      hasPriorSubmission,
      solutionLengthBand: getSolutionLengthBand(solutionLength),
      errorCategory,
      userControl: action === 'challenge_history_loaded' || action === 'challenge_history_load_failed' ? 'observed' : 'explicit',
      mutationScope: 'challenge_workflow',
    },
  });
};
