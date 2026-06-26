import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordNetworkingWorkflowAnalytics } from './networkingWorkflowAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('networkingWorkflowAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records generated suggestions with bounded counts', () => {
    recordNetworkingWorkflowAnalytics({
      userId: 'user-1',
      action: 'networking_suggestions_loaded',
      visibleSuggestionCount: 8,
      hiddenSuggestionCount: 2,
      pendingRequestCount: 3,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'networking',
      eventName: 'automation_suggestion_generated',
      source: 'networking_page',
      objectType: 'networking_suggestions',
      objectId: undefined,
      metadata: expect.objectContaining({
        action: 'networking_suggestions_loaded',
        visibleSuggestionCount: 8,
        hiddenSuggestionCount: 2,
        pendingRequestCount: 3,
        userControl: 'observed',
        mutationScope: 'networking_workflow',
      }),
    });
  });

  it('records connection requests without note text or person details', () => {
    recordNetworkingWorkflowAnalytics({
      action: 'networking_connect_request_sent',
      requestDirection: 'discover',
      requestStatus: 'pending',
      hasRequestNote: true,
      requestNoteLength: 120,
      recommendationScore: 86,
      mutualConnectionCount: 4,
      reasonCount: 3,
      sharedSkillCount: 2,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'networking_connection_request',
      objectId: 'discover',
      metadata: expect.objectContaining({
        action: 'networking_connect_request_sent',
        hasRequestNote: true,
        requestNoteLengthBand: 'medium',
        recommendationScoreBand: 'high',
        mutualConnectionBand: 'many',
        reasonCount: 3,
        sharedSkillCount: 2,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        requestNote: expect.anything(),
        message: expect.anything(),
        fullName: expect.anything(),
        location: expect.anything(),
        skills: expect.anything(),
        recommendationReasons: expect.anything(),
      }),
    }));
  });

  it('records suggestion preference changes without names or reasons', () => {
    recordNetworkingWorkflowAnalytics({
      action: 'networking_suggestion_hidden',
      visibleSuggestionCount: 7,
      hiddenSuggestionCount: 4,
      preferenceSyncStatus: 'local',
      recommendationScore: 42,
      mutualConnectionCount: 1,
      reasonCount: 2,
      profileSkillCount: 5,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'preference_updated',
      objectType: 'networking_suggestion_preference',
      objectId: 'local',
      metadata: expect.objectContaining({
        action: 'networking_suggestion_hidden',
        visibleSuggestionCount: 7,
        hiddenSuggestionCount: 4,
        preferenceSyncStatus: 'local',
        recommendationScoreBand: 'low',
        mutualConnectionBand: 'one',
        reasonCount: 2,
        profileSkillCount: 5,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        profileName: expect.anything(),
        reasonText: expect.anything(),
        skillNames: expect.anything(),
      }),
    }));
  });

  it('records reminder sync failures without exact reminder timestamps or recipient names', () => {
    recordNetworkingWorkflowAnalytics({
      action: 'networking_reminder_sync_failed',
      reminderDelay: 'three-days',
      reminderSyncStatus: 'unavailable',
      reminderCount: 2,
      attemptedSyncCount: 1,
      failedCount: 1,
      errorCategory: 'notification_sync_failed',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'degraded_state_shown',
      objectType: 'networking_reminder',
      objectId: 'three-days',
      metadata: expect.objectContaining({
        action: 'networking_reminder_sync_failed',
        reminderDelay: 'three-days',
        reminderSyncStatus: 'unavailable',
        reminderCount: 2,
        attemptedSyncCount: 1,
        failedCount: 1,
        errorCategory: 'notification_sync_failed',
        userControl: 'observed',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        dueAt: expect.anything(),
        remindAt: expect.anything(),
        recipientName: expect.anything(),
      }),
    }));
  });

  it('records profile previews without profile text', () => {
    recordNetworkingWorkflowAnalytics({
      action: 'networking_profile_preview_opened',
      entryPoint: 'discover_card',
      requestDirection: 'discover',
      recommendationScore: 71,
      mutualConnectionCount: 0,
      reasonCount: 4,
      sharedSkillCount: 3,
      profileSkillCount: 8,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_started',
      objectType: 'networking_profile_preview',
      objectId: 'discover',
      metadata: expect.objectContaining({
        action: 'networking_profile_preview_opened',
        entryPoint: 'discover_card',
        recommendationScoreBand: 'medium',
        mutualConnectionBand: 'none',
        reasonCount: 4,
        sharedSkillCount: 3,
        profileSkillCount: 8,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        headline: expect.anything(),
        summary: expect.anything(),
        bio: expect.anything(),
        fullName: expect.anything(),
      }),
    }));
  });
});
