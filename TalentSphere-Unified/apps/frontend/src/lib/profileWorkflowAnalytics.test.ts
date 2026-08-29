import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordProfileWorkflowAnalytics } from './profileWorkflowAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('profileWorkflowAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records profile load completion with bounded counts', () => {
    recordProfileWorkflowAnalytics({
      userId: 'user-1',
      action: 'profile_loaded',
      viewedProfileScope: 'own',
      skillCount: 4,
      experienceCount: 2,
      educationCount: 1,
      achievementCount: 3,
      completedTaskCount: 4,
      completionPercentage: 100,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'profile',
      eventName: 'task_completed',
      source: 'profile_page',
      objectType: 'profile',
      objectId: undefined,
      metadata: {
        action: 'profile_loaded',
        viewedProfileScope: 'own',
        entryPoint: undefined,
        tabId: undefined,
        rowType: undefined,
        rowMode: undefined,
        fieldKeys: undefined,
        fieldCount: undefined,
        missingFieldCount: undefined,
        skillCount: 4,
        experienceCount: 2,
        educationCount: 1,
        achievementCount: 3,
        completedTaskCount: 4,
        completionBand: 'complete',
        suggestionType: undefined,
        suggestionSource: undefined,
        aiFieldCount: undefined,
        errorCategory: undefined,
        userControl: 'observed',
        mutationScope: 'profile_workflow',
      },
    });
  });

  it('records basic profile saves without profile field values', () => {
    recordProfileWorkflowAnalytics({
      action: 'profile_basic_saved',
      viewedProfileScope: 'own',
      fieldKeys: ['headline', 'location', 'bio'],
      fieldCount: 3,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'profile_basic_info',
      metadata: expect.objectContaining({
        action: 'profile_basic_saved',
        fieldKeys: ['headline', 'location', 'bio'],
        fieldCount: 3,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        headline: expect.anything(),
        location: expect.anything(),
        bio: expect.anything(),
        fullName: expect.anything(),
      }),
    }));
  });

  it('records local suggestion prefill without suggestion value text', () => {
    recordProfileWorkflowAnalytics({
      action: 'profile_suggestion_applied',
      suggestionType: 'skill',
      suggestionSource: 'Profile text',
      fieldKeys: ['skill'],
      fieldCount: 1,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'workflow_prefill_used',
      objectType: 'profile_suggestion',
      objectId: 'skill',
      metadata: expect.objectContaining({
        action: 'profile_suggestion_applied',
        suggestionType: 'skill',
        suggestionSource: 'profile_text',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        value: expect.anything(),
        skillName: expect.anything(),
      }),
    }));
  });

  it('records row saves and delete reviews without row labels or employer/school names', () => {
    recordProfileWorkflowAnalytics({
      action: 'profile_completion_task_saved',
      rowType: 'experience',
      rowMode: 'edit',
      fieldKeys: ['title', 'company', 'startDate'],
      fieldCount: 3,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'profile_completion_task',
      objectId: 'experience',
      metadata: expect.objectContaining({
        action: 'profile_completion_task_saved',
        rowType: 'experience',
        rowMode: 'edit',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        label: expect.anything(),
        company: expect.anything(),
        institution: expect.anything(),
        description: expect.anything(),
      }),
    }));
  });

  it('records failures with error category only', () => {
    recordProfileWorkflowAnalytics({
      action: 'profile_completion_task_save_failed',
      rowType: 'education',
      errorCategory: 'network_error',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_failed',
      objectType: 'profile_completion_task',
      metadata: expect.objectContaining({
        action: 'profile_completion_task_save_failed',
        errorCategory: 'network_error',
      }),
    }));
  });

  it('records photo uploads without image URLs or file names', () => {
    recordProfileWorkflowAnalytics({
      action: 'profile_photo_uploaded',
      viewedProfileScope: 'own',
      entryPoint: 'profile_photo_review',
      fieldKeys: ['avatarUrl'],
      fieldCount: 1,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'profile_photo',
      metadata: expect.objectContaining({
        action: 'profile_photo_uploaded',
        viewedProfileScope: 'own',
        fieldKeys: ['avatarUrl'],
        fieldCount: 1,
        userControl: 'explicit',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        avatarUrl: expect.anything(),
        avatar_url: expect.anything(),
        fileName: expect.anything(),
        imageUrl: expect.anything(),
      }),
    }));
  });

  it('records photo removal without image URLs or file names', () => {
    recordProfileWorkflowAnalytics({
      action: 'profile_photo_removed',
      viewedProfileScope: 'own',
      entryPoint: 'profile_photo_remove',
      fieldKeys: ['avatarUrl'],
      fieldCount: 1,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'profile_photo',
      metadata: expect.objectContaining({
        action: 'profile_photo_removed',
        viewedProfileScope: 'own',
        fieldKeys: ['avatarUrl'],
        fieldCount: 1,
        userControl: 'explicit',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        avatarUrl: expect.anything(),
        avatar_url: expect.anything(),
        fileName: expect.anything(),
        imageUrl: expect.anything(),
      }),
    }));
  });
});
