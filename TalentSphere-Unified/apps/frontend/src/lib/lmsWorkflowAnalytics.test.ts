import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productAnalytics } from './productAnalytics';
import { recordLmsWorkflowAnalytics } from './lmsWorkflowAnalytics';

vi.mock('./productAnalytics', () => ({
  productAnalytics: {
    trackEvent: vi.fn(),
  },
}));

describe('lmsWorkflowAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records catalog load completion without raw search terms', () => {
    recordLmsWorkflowAnalytics({
      userId: 'user-1',
      action: 'lms_catalog_loaded',
      tabId: 'all',
      pageNumber: 2,
      pageSize: 12,
      resultCount: 8,
      totalKnown: true,
      hasNextPage: true,
      hasSearch: true,
      searchLength: 24,
      progressFilter: 'all',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith({
      userId: 'user-1',
      area: 'lms',
      eventName: 'task_completed',
      source: 'lms_page',
      objectType: 'course_catalog',
      objectId: 'all',
      metadata: {
        action: 'lms_catalog_loaded',
        tabId: 'all',
        courseId: undefined,
        lessonId: undefined,
        entryPoint: undefined,
        category: undefined,
        difficulty: undefined,
        progressBand: undefined,
        lessonIndex: undefined,
        lessonCount: undefined,
        completedLessonCount: undefined,
        pageNumber: 2,
        pageSize: 12,
        resultCount: 8,
        totalKnown: true,
        hasNextPage: true,
        hasSearch: true,
        searchLengthBand: 'medium',
        progressFilter: 'all',
        suggestionCount: undefined,
        suggestionLabel: undefined,
        selectedSuggestionIndex: undefined,
        wasEnrolled: undefined,
        autoEnrolled: undefined,
        completionStatus: undefined,
        errorCategory: undefined,
        userControl: 'observed',
        mutationScope: 'lms_workflow',
      },
    });
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        searchTerm: expect.anything(),
        query: expect.anything(),
      }),
    }));
  });

  it('records course opens with coarse progress only', () => {
    recordLmsWorkflowAnalytics({
      action: 'lms_course_opened',
      courseId: 'course-1',
      category: 'Engineering',
      difficulty: 'Advanced',
      progress: 75,
      lessonCount: 10,
      completedLessonCount: 7,
      entryPoint: 'catalog_card',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      area: 'lms',
      eventName: 'task_started',
      objectType: 'course',
      objectId: 'course-1',
      metadata: expect.objectContaining({
        action: 'lms_course_opened',
        courseId: 'course-1',
        category: 'Engineering',
        difficulty: 'Advanced',
        progressBand: 'half_or_more',
        lessonCount: 10,
        completedLessonCount: 7,
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        courseTitle: expect.anything(),
        description: expect.anything(),
        provider: expect.anything(),
      }),
    }));
  });

  it('records enrollment completion as an explicit task completion', () => {
    recordLmsWorkflowAnalytics({
      action: 'lms_enroll_completed',
      courseId: 'course-1',
      category: 'Data',
      difficulty: 'Beginner',
      progress: 0,
      lessonCount: 4,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_completed',
      objectType: 'enrollment',
      objectId: 'course-1',
      metadata: expect.objectContaining({
        action: 'lms_enroll_completed',
        progressBand: 'not_started',
        userControl: 'explicit',
      }),
    }));
  });

  it('records lesson failures with error category only', () => {
    recordLmsWorkflowAnalytics({
      action: 'lms_lesson_complete_failed',
      courseId: 'course-1',
      lessonId: 'lesson-1',
      lessonIndex: 2,
      lessonCount: 5,
      errorCategory: 'network_error',
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'task_failed',
      objectType: 'lesson',
      objectId: 'lesson-1',
      metadata: expect.objectContaining({
        action: 'lms_lesson_complete_failed',
        errorCategory: 'network_error',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        error: expect.anything(),
        lessonTitle: expect.anything(),
      }),
    }));
  });

  it('records AI learning search application without suggestion text', () => {
    recordLmsWorkflowAnalytics({
      action: 'lms_ai_search_applied',
      suggestionCount: 3,
      suggestionLabel: 'Skill',
      selectedSuggestionIndex: 1,
      hasSearch: true,
      searchLength: 18,
    });

    expect(productAnalytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventName: 'workflow_prefill_used',
      objectType: 'ai_learning_plan',
      metadata: expect.objectContaining({
        action: 'lms_ai_search_applied',
        suggestionCount: 3,
        suggestionLabel: 'Skill',
        selectedSuggestionIndex: 1,
        searchLengthBand: 'short',
      }),
    }));
    expect(productAnalytics.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        searchTerm: expect.anything(),
        suggestions: expect.anything(),
        recommendationText: expect.anything(),
      }),
    }));
  });
});
