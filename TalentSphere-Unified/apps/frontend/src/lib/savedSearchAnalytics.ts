import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';
import type { SavedJobSearchRecord } from '../services/jobService';

export type SavedSearchAnalyticsAction =
  | 'saved_search_created'
  | 'saved_search_updated'
  | 'saved_search_applied'
  | 'saved_search_deleted'
  | 'saved_search_delete_review_opened'
  | 'saved_search_delete_cancelled'
  | 'saved_search_alert_enabled'
  | 'saved_search_alert_disabled';

interface SavedSearchAnalyticsInput {
  userId?: string | null;
  action: SavedSearchAnalyticsAction;
  savedSearch?: Pick<SavedJobSearchRecord, 'id' | 'name' | 'searchTerm' | 'filters' | 'alertEnabled'> | null;
  matchCount?: number;
  savedSearchCountBefore?: number;
  savedSearchCountAfter?: number;
}

const getEventName = (action: SavedSearchAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'saved_search_applied':
      return 'task_completed';
    case 'saved_search_delete_review_opened':
      return 'task_started';
    case 'saved_search_delete_cancelled':
      return 'task_abandoned';
    case 'saved_search_created':
    case 'saved_search_updated':
    case 'saved_search_deleted':
    case 'saved_search_alert_enabled':
    case 'saved_search_alert_disabled':
    default:
      return 'preference_updated';
  }
};

const getFilterCount = (savedSearch?: SavedSearchAnalyticsInput['savedSearch']) => {
  if (!savedSearch) return 0;

  return [
    savedSearch.searchTerm?.trim(),
    savedSearch.filters.jobType,
    savedSearch.filters.location?.trim(),
    savedSearch.filters.minSalary,
    savedSearch.filters.maxSalary,
  ].filter(Boolean).length;
};

export const recordSavedSearchAnalytics = ({
  userId,
  action,
  savedSearch,
  matchCount,
  savedSearchCountBefore,
  savedSearchCountAfter,
}: SavedSearchAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'jobs',
    eventName: getEventName(action),
    source: 'jobs_saved_searches',
    objectType: 'saved_job_search',
    objectId: savedSearch?.id,
    metadata: {
      action,
      filterCount: getFilterCount(savedSearch),
      hasSearchTerm: Boolean(savedSearch?.searchTerm?.trim()),
      jobType: savedSearch?.filters.jobType || undefined,
      hasLocationFilter: Boolean(savedSearch?.filters.location?.trim()),
      hasMinSalary: Boolean(savedSearch?.filters.minSalary),
      hasMaxSalary: Boolean(savedSearch?.filters.maxSalary),
      alertEnabled: Boolean(savedSearch?.alertEnabled),
      matchCount,
      savedSearchCountBefore,
      savedSearchCountAfter,
      userControl: 'explicit',
      mutationScope: 'saved_search_preference',
    },
  });
};
