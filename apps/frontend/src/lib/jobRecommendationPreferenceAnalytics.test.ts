import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordJobRecommendationPreferenceAnalytics } from './jobRecommendationPreferenceAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('jobRecommendationPreferenceAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records explicit hide decisions as preference updates', () => {
    recordJobRecommendationPreferenceAnalytics({
      userId: 'user-1',
      action: 'hide',
      job: {
        id: 'job-1',
        title: 'Frontend Engineer',
        companyName: 'Acme Labs',
        jobType: 'FULL_TIME',
        matchScore: 82,
      },
      hiddenCountBefore: 1,
      hiddenCountAfter: 2,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'jobs',
      eventName: 'preference_updated',
      source: 'jobs_explore_recommendation_preferences',
      objectType: 'job',
      objectId: 'job-1',
      metadata: {
        action: 'hide',
        jobTitle: 'Frontend Engineer',
        companyName: 'Acme Labs',
        jobType: 'FULL_TIME',
        matchScore: 82,
        filterType: undefined,
        filterValue: undefined,
        filterLabel: undefined,
        hiddenCountBefore: 1,
        hiddenCountAfter: 2,
        restoredCount: 0,
        userControl: 'explicit',
        mutationScope: 'recommendation_visibility_preference',
      },
    });
  });

  it('records restore-last decisions with the restored hidden job context', () => {
    recordJobRecommendationPreferenceAnalytics({
      userId: 'user-1',
      action: 'restore_last',
      job: {
        jobId: 'job-1',
        title: 'Frontend Engineer',
        companyName: 'Acme Labs',
        hiddenAt: '2026-06-26T10:00:00.000Z',
      },
      hiddenCountBefore: 2,
      hiddenCountAfter: 1,
      restoredCount: 1,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'preference_updated',
      objectType: 'job',
      objectId: 'job-1',
      metadata: expect.objectContaining({
        action: 'restore_last',
        jobTitle: 'Frontend Engineer',
        jobType: undefined,
        hiddenCountBefore: 2,
        hiddenCountAfter: 1,
        restoredCount: 1,
      }),
    }));
  });

  it('records restore-all decisions without pretending a single job changed', () => {
    recordJobRecommendationPreferenceAnalytics({
      userId: 'user-1',
      action: 'restore_all',
      hiddenCountBefore: 3,
      hiddenCountAfter: 0,
      restoredCount: 3,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      objectType: 'hidden_explore_jobs',
      objectId: undefined,
      metadata: expect.objectContaining({
        action: 'restore_all',
        restoredCount: 3,
      }),
    }));
  });

  it('records explicit current-view preference filter decisions', () => {
    recordJobRecommendationPreferenceAnalytics({
      userId: 'user-1',
      action: 'apply_view_filter',
      filterType: 'job_type',
      filterValue: 'CONTRACT',
      filterLabel: 'Contract',
      hiddenCountBefore: 4,
      hiddenCountAfter: 4,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      objectType: 'job_preference_filter',
      objectId: 'CONTRACT',
      metadata: expect.objectContaining({
        action: 'apply_view_filter',
        filterType: 'job_type',
        filterValue: 'CONTRACT',
        filterLabel: 'Contract',
        userControl: 'explicit',
      }),
    }));
  });
});
