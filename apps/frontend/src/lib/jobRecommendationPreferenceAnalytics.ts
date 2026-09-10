import { productAnalytics } from './productAnalytics';
import type { HiddenExploreJob } from './hiddenExploreJobs';
import type { Job } from '../types/job';

type JobRecommendationPreferenceAction =
  | 'hide'
  | 'restore_last'
  | 'restore_all'
  | 'apply_view_filter'
  | 'clear_view_filter';

interface JobRecommendationPreferenceAnalyticsInput {
  userId?: string | null;
  action: JobRecommendationPreferenceAction;
  job?: Pick<Job, 'id' | 'title' | 'companyName' | 'matchScore' | 'jobType'> | HiddenExploreJob | null;
  filterType?: 'job_type';
  filterValue?: string;
  filterLabel?: string;
  hiddenCountBefore?: number;
  hiddenCountAfter?: number;
  restoredCount?: number;
}

const getJobId = (job?: JobRecommendationPreferenceAnalyticsInput['job']) => (
  job && 'jobId' in job ? job.jobId : job?.id
);

const getJobTitle = (job?: JobRecommendationPreferenceAnalyticsInput['job']) => (
  job?.title || undefined
);

const getJobCompanyName = (job?: JobRecommendationPreferenceAnalyticsInput['job']) => (
  job?.companyName || undefined
);

const getMatchScore = (job?: JobRecommendationPreferenceAnalyticsInput['job']) => (
  job && 'matchScore' in job ? job.matchScore : undefined
);

const getJobType = (job?: JobRecommendationPreferenceAnalyticsInput['job']) => (
  job?.jobType || undefined
);

const isViewFilterAction = (action: JobRecommendationPreferenceAction) => (
  action === 'apply_view_filter' || action === 'clear_view_filter'
);

export const recordJobRecommendationPreferenceAnalytics = ({
  userId,
  action,
  job,
  filterType,
  filterValue,
  filterLabel,
  hiddenCountBefore = 0,
  hiddenCountAfter = 0,
  restoredCount = 0,
}: JobRecommendationPreferenceAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'jobs',
    eventName: 'preference_updated',
    source: 'jobs_explore_recommendation_preferences',
    objectType: action === 'restore_all'
      ? 'hidden_explore_jobs'
      : isViewFilterAction(action)
        ? 'job_preference_filter'
        : 'job',
    objectId: action === 'restore_all'
      ? undefined
      : isViewFilterAction(action)
        ? filterValue || undefined
        : getJobId(job) || undefined,
    metadata: {
      action,
      jobTitle: getJobTitle(job),
      companyName: getJobCompanyName(job),
      jobType: getJobType(job),
      matchScore: getMatchScore(job),
      filterType,
      filterValue,
      filterLabel,
      hiddenCountBefore,
      hiddenCountAfter,
      restoredCount,
      userControl: 'explicit',
      mutationScope: 'recommendation_visibility_preference',
    },
  });
};
