import { productAnalytics } from './productAnalytics';

type RecruiterPublishAnalyticsAction = 'review_opened' | 'publish_completed' | 'publish_failed';

interface RecruiterPublishAnalyticsInput {
  userId?: string | null;
  jobId?: string | null;
  jobStatus?: string | null;
  issues?: string[];
  action: RecruiterPublishAnalyticsAction;
  errorMessage?: string;
}

const getEventName = (action: RecruiterPublishAnalyticsAction) => {
  switch (action) {
    case 'publish_completed':
      return 'task_completed';
    case 'publish_failed':
      return 'task_failed';
    case 'review_opened':
    default:
      return 'task_started';
  }
};

export const recordRecruiterPublishAnalytics = ({
  userId,
  jobId,
  jobStatus,
  issues = [],
  action,
  errorMessage,
}: RecruiterPublishAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'jobs',
    eventName: getEventName(action),
    source: 'recruiter_publish_review',
    objectType: 'job',
    objectId: jobId || undefined,
    metadata: {
      action,
      jobStatus: jobStatus || 'unknown',
      issueCount: issues.length,
      issues,
      overrideUsed: action === 'publish_completed' && issues.length > 0,
      ...(errorMessage ? { errorMessage } : {}),
    },
  });
};
