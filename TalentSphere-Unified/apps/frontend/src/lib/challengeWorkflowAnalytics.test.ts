import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordChallengeWorkflowAnalytics } from './challengeWorkflowAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('challengeWorkflowAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records category selection as a preference update', () => {
    recordChallengeWorkflowAnalytics({
      userId: 'user-1',
      action: 'challenge_category_selected',
      category: 'coding',
      visibleChallengeCount: 7,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'challenges',
      eventName: 'preference_updated',
      source: 'challenges_page',
      objectType: 'challenge_filter',
      objectId: 'coding',
      metadata: {
        action: 'challenge_category_selected',
        challengeId: undefined,
        category: 'coding',
        difficulty: undefined,
        language: undefined,
        entryPoint: undefined,
        visibleChallengeCount: 7,
        sampleCaseCount: undefined,
        runnableSampleCaseCount: undefined,
        passedSampleCaseCount: undefined,
        failedSampleCaseCount: undefined,
        errorSampleCaseCount: undefined,
        submissionStatus: undefined,
        submissionScoreBand: undefined,
        attemptCount: undefined,
        hasPriorSubmission: undefined,
        solutionLengthBand: undefined,
        errorCategory: undefined,
        userControl: 'explicit',
        mutationScope: 'challenge_workflow',
      },
    });
  });

  it('records workspace opens without challenge prompt text', () => {
    recordChallengeWorkflowAnalytics({
      action: 'challenge_workspace_opened',
      challengeId: 'challenge-1',
      category: 'coding',
      difficulty: 'medium',
      sampleCaseCount: 3,
      runnableSampleCaseCount: 2,
      entryPoint: 'card',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_started',
      objectType: 'challenge',
      objectId: 'challenge-1',
      metadata: expect.objectContaining({
        action: 'challenge_workspace_opened',
        challengeId: 'challenge-1',
        sampleCaseCount: 3,
        runnableSampleCaseCount: 2,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        title: expect.anything(),
        description: expect.anything(),
        prompt: expect.anything(),
      }),
    }));
  });

  it('records local check completion with counts only', () => {
    recordChallengeWorkflowAnalytics({
      action: 'challenge_local_check_completed',
      challengeId: 'challenge-1',
      language: 'javascript',
      runnableSampleCaseCount: 4,
      passedSampleCaseCount: 3,
      failedSampleCaseCount: 1,
      errorSampleCaseCount: 0,
      solutionLength: 720,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'challenge_workspace',
      metadata: expect.objectContaining({
        action: 'challenge_local_check_completed',
        passedSampleCaseCount: 3,
        failedSampleCaseCount: 1,
        errorSampleCaseCount: 0,
        solutionLengthBand: 'medium',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        solution: expect.anything(),
        input: expect.anything(),
        expected: expect.anything(),
        actual: expect.anything(),
      }),
    }));
  });

  it('records reset review decisions without solution code', () => {
    recordChallengeWorkflowAnalytics({
      userId: 'user-1',
      action: 'challenge_code_reset_review_opened',
      challengeId: 'challenge-1',
      language: 'javascript',
      solutionLength: 1200,
      sampleCaseCount: 3,
    });
    recordChallengeWorkflowAnalytics({
      userId: 'user-1',
      action: 'challenge_code_reset_cancelled',
      challengeId: 'challenge-1',
      language: 'javascript',
      solutionLength: 1200,
      sampleCaseCount: 3,
    });

    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      eventName: 'task_started',
      objectType: 'challenge_workspace',
      objectId: 'challenge-1',
      metadata: expect.objectContaining({
        action: 'challenge_code_reset_review_opened',
        language: 'javascript',
        solutionLengthBand: 'medium',
        sampleCaseCount: 3,
      }),
    }));
    expect(productAnalytics.trackEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      eventName: 'task_abandoned',
      objectType: 'challenge_workspace',
      objectId: 'challenge-1',
      metadata: expect.objectContaining({
        action: 'challenge_code_reset_cancelled',
        language: 'javascript',
        solutionLengthBand: 'medium',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        solution: expect.anything(),
        starterCode: expect.anything(),
        input: expect.anything(),
      }),
    }));
  });

  it('records submission outcomes without solution or feedback text', () => {
    recordChallengeWorkflowAnalytics({
      action: 'challenge_submission_completed',
      challengeId: 'challenge-1',
      language: 'typescript',
      submissionStatus: 'PASSED',
      submissionScoreBand: 'high',
      attemptCount: 2,
      hasPriorSubmission: true,
      solutionLength: 1200,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'challenge_submission',
      metadata: expect.objectContaining({
        action: 'challenge_submission_completed',
        submissionStatus: 'PASSED',
        submissionScoreBand: 'high',
        attemptCount: 2,
        hasPriorSubmission: true,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        solution: expect.anything(),
        feedback: expect.anything(),
      }),
    }));
  });

  it('records failure with error category only', () => {
    recordChallengeWorkflowAnalytics({
      action: 'challenge_submission_failed',
      challengeId: 'challenge-1',
      language: 'python',
      errorCategory: 'auth_required',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_failed',
      objectType: 'challenge_submission',
      metadata: expect.objectContaining({
        action: 'challenge_submission_failed',
        errorCategory: 'auth_required',
      }),
    }));
  });
});
