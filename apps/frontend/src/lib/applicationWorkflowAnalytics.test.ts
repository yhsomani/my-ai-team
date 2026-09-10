import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordApplicationWorkflowAnalytics } from './applicationWorkflowAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('applicationWorkflowAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records application review opens as task starts', () => {
    recordApplicationWorkflowAnalytics({
      userId: 'user-1',
      action: 'application_review_opened',
      jobId: 'job-1',
      draftSource: 'manual',
      hasSavedDraft: true,
      hasResumeUrl: true,
      hasCoverLetter: false,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'applications',
      eventName: 'task_started',
      source: 'jobs_application_review',
      objectType: 'job',
      objectId: 'job-1',
      metadata: {
        action: 'application_review_opened',
        jobId: 'job-1',
        applicationId: undefined,
        draftSource: 'manual',
        hasSavedDraft: true,
        hasResumeUrl: true,
        hasCoverLetter: false,
        fieldCount: 1,
        errorCategory: undefined,
        userControl: 'explicit',
        mutationScope: 'application_review_workflow',
      },
    });
  });

  it('records profile draft use as a prefill decision without field contents', () => {
    recordApplicationWorkflowAnalytics({
      action: 'application_profile_draft_used',
      jobId: 'job-1',
      draftSource: 'profile',
      hasResumeUrl: true,
      hasCoverLetter: true,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      area: 'applications',
      eventName: 'workflow_prefill_used',
      objectType: 'job',
      objectId: 'job-1',
      metadata: expect.objectContaining({
        action: 'application_profile_draft_used',
        fieldCount: 2,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        resumeUrl: expect.anything(),
        coverLetter: expect.anything(),
      }),
    }));
  });

  it('records profile draft replace review decisions without field contents', () => {
    recordApplicationWorkflowAnalytics({
      userId: 'user-1',
      action: 'application_profile_draft_review_opened',
      jobId: 'job-1',
      draftSource: 'manual',
      hasSavedDraft: true,
      hasResumeUrl: true,
      hasCoverLetter: true,
    });
    recordApplicationWorkflowAnalytics({
      userId: 'user-1',
      action: 'application_profile_draft_cancelled',
      jobId: 'job-1',
      draftSource: 'manual',
      hasSavedDraft: true,
      hasResumeUrl: true,
      hasCoverLetter: true,
    });

    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      eventName: 'task_started',
      objectType: 'job',
      objectId: 'job-1',
      metadata: expect.objectContaining({
        action: 'application_profile_draft_review_opened',
        draftSource: 'manual',
        hasSavedDraft: true,
        fieldCount: 2,
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      eventName: 'task_abandoned',
      objectType: 'job',
      objectId: 'job-1',
      metadata: expect.objectContaining({
        action: 'application_profile_draft_cancelled',
        draftSource: 'manual',
        hasSavedDraft: true,
        fieldCount: 2,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        resumeUrl: expect.anything(),
        coverLetter: expect.anything(),
      }),
    }));
  });

  it('records successful application submission against the application object', () => {
    recordApplicationWorkflowAnalytics({
      userId: 'user-1',
      action: 'application_submitted',
      jobId: 'job-1',
      applicationId: 'application-1',
      draftSource: 'manual',
      hasCoverLetter: true,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'application',
      objectId: 'application-1',
      metadata: expect.objectContaining({
        action: 'application_submitted',
        jobId: 'job-1',
        applicationId: 'application-1',
        hasCoverLetter: true,
      }),
    }));
  });

  it('records application draft clear review decisions without draft contents', () => {
    recordApplicationWorkflowAnalytics({
      userId: 'user-1',
      action: 'application_draft_clear_review_opened',
      jobId: 'job-1',
      draftSource: 'ai',
      hasSavedDraft: true,
      hasResumeUrl: true,
      hasCoverLetter: true,
    });
    recordApplicationWorkflowAnalytics({
      userId: 'user-1',
      action: 'application_draft_clear_cancelled',
      jobId: 'job-1',
      draftSource: 'ai',
      hasSavedDraft: true,
      hasResumeUrl: true,
      hasCoverLetter: true,
    });

    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      eventName: 'task_started',
      objectType: 'job',
      objectId: 'job-1',
      metadata: expect.objectContaining({
        action: 'application_draft_clear_review_opened',
        draftSource: 'ai',
        hasSavedDraft: true,
        fieldCount: 2,
        userControl: 'explicit',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      eventName: 'task_abandoned',
      objectType: 'job',
      objectId: 'job-1',
      metadata: expect.objectContaining({
        action: 'application_draft_clear_cancelled',
        draftSource: 'ai',
        hasSavedDraft: true,
        fieldCount: 2,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        resumeUrl: expect.anything(),
        coverLetter: expect.anything(),
      }),
    }));
  });

  it('records application submission failures with an error category', () => {
    recordApplicationWorkflowAnalytics({
      action: 'application_submit_failed',
      jobId: 'job-1',
      errorCategory: 'network_error',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_failed',
      objectType: 'job',
      objectId: 'job-1',
      metadata: expect.objectContaining({
        action: 'application_submit_failed',
        errorCategory: 'network_error',
      }),
    }));
  });
});
