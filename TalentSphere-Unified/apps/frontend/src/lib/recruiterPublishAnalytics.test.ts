import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordRecruiterPublishAnalytics } from './recruiterPublishAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('recruiterPublishAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records publish review opens as a jobs task start', () => {
    recordRecruiterPublishAnalytics({
      userId: 'recruiter-1',
      jobId: 'job-1',
      jobStatus: 'DRAFT',
      issues: ['Add company context'],
      action: 'review_opened',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'recruiter-1',
      area: 'jobs',
      eventName: 'task_started',
      source: 'recruiter_publish_review',
      objectType: 'job',
      objectId: 'job-1',
      metadata: {
        action: 'review_opened',
        jobStatus: 'DRAFT',
        issueCount: 1,
        issues: ['Add company context'],
        overrideUsed: false,
      },
    });
  });

  it('records clean publish completion without override metadata', () => {
    recordRecruiterPublishAnalytics({
      userId: 'recruiter-1',
      jobId: 'job-1',
      jobStatus: 'DRAFT',
      issues: [],
      action: 'publish_completed',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      metadata: expect.objectContaining({
        action: 'publish_completed',
        issueCount: 0,
        overrideUsed: false,
      }),
    }));
  });

  it('marks publish completion as an override when checklist issues remain', () => {
    recordRecruiterPublishAnalytics({
      userId: 'recruiter-1',
      jobId: 'job-1',
      jobStatus: 'DRAFT',
      issues: ['Add requirements'],
      action: 'publish_completed',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      metadata: expect.objectContaining({
        issueCount: 1,
        overrideUsed: true,
      }),
    }));
  });

  it('records publish failures without blocking the workflow', () => {
    recordRecruiterPublishAnalytics({
      userId: 'recruiter-1',
      jobId: 'job-1',
      jobStatus: 'DRAFT',
      issues: ['Add requirements'],
      action: 'publish_failed',
      errorMessage: 'Network unavailable',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_failed',
      metadata: expect.objectContaining({
        action: 'publish_failed',
        errorMessage: 'Network unavailable',
        overrideUsed: false,
      }),
    }));
  });
});
