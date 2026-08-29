import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordSavedSearchAnalytics } from './savedSearchAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

const savedSearch = {
  id: 'search-1',
  name: 'Frontend remote',
  searchTerm: 'frontend engineer',
  filters: {
    jobType: 'FULL_TIME',
    location: 'Remote',
    minSalary: '120000',
    maxSalary: '',
  },
  alertEnabled: true,
};

describe('savedSearchAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records saved-search create decisions without raw search text or names', () => {
    recordSavedSearchAnalytics({
      userId: 'user-1',
      action: 'saved_search_created',
      savedSearch,
      matchCount: 12,
      savedSearchCountBefore: 1,
      savedSearchCountAfter: 2,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'jobs',
      eventName: 'preference_updated',
      source: 'jobs_saved_searches',
      objectType: 'saved_job_search',
      objectId: 'search-1',
      metadata: {
        action: 'saved_search_created',
        filterCount: 4,
        hasSearchTerm: true,
        jobType: 'FULL_TIME',
        hasLocationFilter: true,
        hasMinSalary: true,
        hasMaxSalary: false,
        alertEnabled: true,
        matchCount: 12,
        savedSearchCountBefore: 1,
        savedSearchCountAfter: 2,
        userControl: 'explicit',
        mutationScope: 'saved_search_preference',
      },
    });
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        searchTerm: expect.anything(),
        name: expect.anything(),
      }),
    }));
  });

  it('records saved-search application as a completed task', () => {
    recordSavedSearchAnalytics({
      userId: 'user-1',
      action: 'saved_search_applied',
      savedSearch,
      matchCount: 8,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      source: 'jobs_saved_searches',
      objectId: 'search-1',
      metadata: expect.objectContaining({
        action: 'saved_search_applied',
        matchCount: 8,
        userControl: 'explicit',
      }),
    }));
  });

  it('records alert toggles as explicit preference updates', () => {
    recordSavedSearchAnalytics({
      action: 'saved_search_alert_disabled',
      savedSearch: {
        ...savedSearch,
        alertEnabled: false,
      },
      matchCount: 0,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'preference_updated',
      metadata: expect.objectContaining({
        action: 'saved_search_alert_disabled',
        alertEnabled: false,
        matchCount: 0,
      }),
    }));
  });

  it('records saved-search delete review decisions without raw search text or names', () => {
    recordSavedSearchAnalytics({
      userId: 'user-1',
      action: 'saved_search_delete_review_opened',
      savedSearch,
      matchCount: 4,
      savedSearchCountBefore: 2,
      savedSearchCountAfter: 2,
    });
    recordSavedSearchAnalytics({
      userId: 'user-1',
      action: 'saved_search_delete_cancelled',
      savedSearch,
      matchCount: 4,
      savedSearchCountBefore: 2,
      savedSearchCountAfter: 2,
    });

    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      eventName: 'task_started',
      objectId: 'search-1',
      metadata: expect.objectContaining({
        action: 'saved_search_delete_review_opened',
        filterCount: 4,
        alertEnabled: true,
        matchCount: 4,
        savedSearchCountBefore: 2,
        savedSearchCountAfter: 2,
        userControl: 'explicit',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      eventName: 'task_abandoned',
      objectId: 'search-1',
      metadata: expect.objectContaining({
        action: 'saved_search_delete_cancelled',
        filterCount: 4,
        alertEnabled: true,
        matchCount: 4,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        searchTerm: expect.anything(),
        name: expect.anything(),
      }),
    }));
  });
});
