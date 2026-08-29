import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordCandidateWorkflowAnalytics } from './candidateWorkflowAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('candidateWorkflowAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records candidate detail opens as explicit task starts', () => {
    recordCandidateWorkflowAnalytics({
      userId: 'recruiter-1',
      action: 'candidate_details_opened',
      applicationId: 'application-1',
      jobId: 'job-1',
      entryPoint: 'row',
      hasScorecard: true,
      hasRecruiterNote: false,
      advisoryScore: 84,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'recruiter-1',
      area: 'candidates',
      eventName: 'task_started',
      source: 'candidate_pipeline',
      objectType: 'application',
      objectId: 'application-1',
      metadata: {
        action: 'candidate_details_opened',
        applicationId: 'application-1',
        jobId: 'job-1',
        targetStatus: undefined,
        previousStatus: undefined,
        reviewFocus: undefined,
        entryPoint: 'row',
        visibleCount: undefined,
        selectedCount: undefined,
        eligibleCount: undefined,
        skippedCount: undefined,
        succeededCount: undefined,
        failedCount: undefined,
        hasScorecard: true,
        hasRecruiterNote: false,
        advisoryScoreBand: 'high',
        scorecardSource: undefined,
        errorCategory: undefined,
        userControl: 'explicit',
        mutationScope: 'candidate_review_workflow',
      },
    });
  });

  it('records single status outcomes without candidate private review content', () => {
    recordCandidateWorkflowAnalytics({
      action: 'candidate_status_completed',
      applicationId: 'application-1',
      jobId: 'job-1',
      previousStatus: 'PENDING',
      targetStatus: 'INTERVIEW',
      hasScorecard: false,
      hasRecruiterNote: true,
      advisoryScore: 55,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'application',
      objectId: 'application-1',
      metadata: expect.objectContaining({
        action: 'candidate_status_completed',
        previousStatus: 'PENDING',
        targetStatus: 'INTERVIEW',
        advisoryScoreBand: 'medium',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        note: expect.anything(),
        evidence: expect.anything(),
        resumeUrl: expect.anything(),
        coverLetter: expect.anything(),
      }),
    }));
  });

  it('records bulk review and confirmation with counts only', () => {
    recordCandidateWorkflowAnalytics({
      action: 'candidate_bulk_status_reviewed',
      targetStatus: 'REJECTED',
      selectedCount: 5,
      eligibleCount: 3,
      skippedCount: 2,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'bulk_action_reviewed',
      objectType: 'candidate_selection',
      metadata: expect.objectContaining({
        action: 'candidate_bulk_status_reviewed',
        selectedCount: 5,
        eligibleCount: 3,
        skippedCount: 2,
      }),
    }));

    vi.clearAllMocks();

    recordCandidateWorkflowAnalytics({
      action: 'candidate_bulk_status_confirmed',
      targetStatus: 'REJECTED',
      succeededCount: 3,
      failedCount: 0,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'bulk_action_confirmed',
      objectType: 'candidate_selection',
      metadata: expect.objectContaining({
        action: 'candidate_bulk_status_confirmed',
        succeededCount: 3,
        failedCount: 0,
      }),
    }));
  });

  it('records draft-only candidate workflow prefills as prefill use', () => {
    recordCandidateWorkflowAnalytics({
      action: 'candidate_interview_plan_inserted',
      applicationId: 'application-1',
      jobId: 'job-1',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'workflow_prefill_used',
      objectType: 'application',
      objectId: 'application-1',
      metadata: expect.objectContaining({
        action: 'candidate_interview_plan_inserted',
      }),
    }));
  });

  it('records candidate status failures with an error category', () => {
    recordCandidateWorkflowAnalytics({
      action: 'candidate_status_failed',
      applicationId: 'application-1',
      targetStatus: 'OFFER',
      errorCategory: 'network_error',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_failed',
      objectType: 'application',
      objectId: 'application-1',
      metadata: expect.objectContaining({
        action: 'candidate_status_failed',
        errorCategory: 'network_error',
      }),
    }));
  });

  it('records private review reset decisions without note or scorecard content', () => {
    recordCandidateWorkflowAnalytics({
      userId: 'recruiter-1',
      action: 'candidate_review_reset_review_opened',
      applicationId: 'application-1',
      jobId: 'job-1',
      hasRecruiterNote: true,
      hasScorecard: true,
      hasUnsavedNote: true,
      hasUnsavedScorecard: true,
      scorecardSource: 'local',
    });
    recordCandidateWorkflowAnalytics({
      userId: 'recruiter-1',
      action: 'candidate_review_reset_cancelled',
      applicationId: 'application-1',
      jobId: 'job-1',
      hasUnsavedNote: true,
      hasUnsavedScorecard: true,
    });
    recordCandidateWorkflowAnalytics({
      userId: 'recruiter-1',
      action: 'candidate_review_reset_confirmed',
      applicationId: 'application-1',
      jobId: 'job-1',
      hasUnsavedNote: true,
      hasUnsavedScorecard: true,
    });

    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      eventName: 'task_started',
      objectType: 'application',
      objectId: 'application-1',
      metadata: expect.objectContaining({
        action: 'candidate_review_reset_review_opened',
        hasRecruiterNote: true,
        hasScorecard: true,
        hasUnsavedNote: true,
        hasUnsavedScorecard: true,
        scorecardSource: 'local',
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      eventName: 'task_abandoned',
      metadata: expect.objectContaining({
        action: 'candidate_review_reset_cancelled',
        hasUnsavedNote: true,
        hasUnsavedScorecard: true,
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(3, expect.objectContaining({
      eventName: 'task_completed',
      metadata: expect.objectContaining({
        action: 'candidate_review_reset_confirmed',
        hasUnsavedNote: true,
        hasUnsavedScorecard: true,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        note: expect.anything(),
        evidence: expect.anything(),
        ratings: expect.anything(),
        scorecardEvidence: expect.anything(),
      }),
    }));
  });
});
