import { productAnalytics, type ProductAnalyticsEventName } from './productAnalytics';
import type { Course } from '../types/lms';

export type LmsWorkflowAnalyticsAction =
  | 'lms_catalog_loaded'
  | 'lms_catalog_load_failed'
  | 'lms_tab_selected'
  | 'lms_search_submitted'
  | 'lms_course_page_changed'
  | 'lms_page_size_changed'
  | 'lms_course_opened'
  | 'lms_enroll_completed'
  | 'lms_enroll_failed'
  | 'lms_lesson_selected'
  | 'lms_lesson_completed'
  | 'lms_lesson_complete_failed'
  | 'lms_ai_plan_review_opened'
  | 'lms_ai_search_applied'
  | 'lms_ai_plan_dismissed';

interface LmsWorkflowAnalyticsInput {
  userId?: string | null;
  action: LmsWorkflowAnalyticsAction;
  tabId?: string;
  courseId?: string | null;
  lessonId?: string | null;
  entryPoint?: string;
  category?: string;
  difficulty?: Course['difficulty'] | string;
  progress?: number | null;
  lessonIndex?: number;
  lessonCount?: number;
  completedLessonCount?: number;
  pageNumber?: number;
  pageSize?: number;
  resultCount?: number;
  totalKnown?: boolean;
  hasNextPage?: boolean;
  hasSearch?: boolean;
  searchLength?: number;
  progressFilter?: string;
  suggestionCount?: number;
  suggestionLabel?: string;
  selectedSuggestionIndex?: number;
  wasEnrolled?: boolean;
  autoEnrolled?: boolean;
  completionStatus?: 'lesson_completed' | 'course_completed';
  errorCategory?: string;
}

const getEventName = (action: LmsWorkflowAnalyticsAction): ProductAnalyticsEventName => {
  switch (action) {
    case 'lms_catalog_loaded':
    case 'lms_enroll_completed':
    case 'lms_lesson_completed':
      return 'task_completed';
    case 'lms_catalog_load_failed':
    case 'lms_enroll_failed':
    case 'lms_lesson_complete_failed':
      return 'task_failed';
    case 'lms_tab_selected':
    case 'lms_search_submitted':
    case 'lms_course_page_changed':
    case 'lms_page_size_changed':
      return 'preference_updated';
    case 'lms_ai_search_applied':
      return 'workflow_prefill_used';
    case 'lms_ai_plan_dismissed':
      return 'workflow_prefill_rejected';
    case 'lms_course_opened':
    case 'lms_lesson_selected':
    case 'lms_ai_plan_review_opened':
    default:
      return 'task_started';
  }
};

const getObjectType = (action: LmsWorkflowAnalyticsAction) => {
  switch (action) {
    case 'lms_tab_selected':
    case 'lms_search_submitted':
    case 'lms_course_page_changed':
    case 'lms_page_size_changed':
      return 'course_filter';
    case 'lms_course_opened':
      return 'course';
    case 'lms_enroll_completed':
    case 'lms_enroll_failed':
      return 'enrollment';
    case 'lms_lesson_selected':
    case 'lms_lesson_completed':
    case 'lms_lesson_complete_failed':
      return 'lesson';
    case 'lms_ai_plan_review_opened':
    case 'lms_ai_search_applied':
    case 'lms_ai_plan_dismissed':
      return 'ai_learning_plan';
    case 'lms_catalog_loaded':
    case 'lms_catalog_load_failed':
    default:
      return 'course_catalog';
  }
};

const getObjectId = ({
  lessonId,
  courseId,
  tabId,
}: Pick<LmsWorkflowAnalyticsInput, 'lessonId' | 'courseId' | 'tabId'>) => (
  lessonId || courseId || tabId || undefined
);

const getProgressBand = (progress?: number | null) => {
  if (progress === null || progress === undefined || !Number.isFinite(progress)) return undefined;
  if (progress <= 0) return 'not_started';
  if (progress >= 100) return 'completed';
  if (progress >= 50) return 'half_or_more';
  return 'started';
};

const getSearchLengthBand = (searchLength?: number) => {
  if (searchLength === undefined || !Number.isFinite(searchLength)) return undefined;
  if (searchLength === 0) return 'empty';
  if (searchLength <= 20) return 'short';
  if (searchLength <= 60) return 'medium';
  return 'long';
};

export const recordLmsWorkflowAnalytics = ({
  userId,
  action,
  tabId,
  courseId,
  lessonId,
  entryPoint,
  category,
  difficulty,
  progress,
  lessonIndex,
  lessonCount,
  completedLessonCount,
  pageNumber,
  pageSize,
  resultCount,
  totalKnown,
  hasNextPage,
  hasSearch,
  searchLength,
  progressFilter,
  suggestionCount,
  suggestionLabel,
  selectedSuggestionIndex,
  wasEnrolled,
  autoEnrolled,
  completionStatus,
  errorCategory,
}: LmsWorkflowAnalyticsInput) => {
  void productAnalytics.trackEvent({
    userId,
    area: 'lms',
    eventName: getEventName(action),
    source: 'lms_page',
    objectType: getObjectType(action),
    objectId: getObjectId({ lessonId, courseId, tabId }),
    metadata: {
      action,
      tabId,
      courseId,
      lessonId,
      entryPoint,
      category,
      difficulty,
      progressBand: getProgressBand(progress),
      lessonIndex,
      lessonCount,
      completedLessonCount,
      pageNumber,
      pageSize,
      resultCount,
      totalKnown,
      hasNextPage,
      hasSearch,
      searchLengthBand: getSearchLengthBand(searchLength),
      progressFilter,
      suggestionCount,
      suggestionLabel,
      selectedSuggestionIndex,
      wasEnrolled,
      autoEnrolled,
      completionStatus,
      errorCategory,
      userControl: action === 'lms_catalog_loaded' || action === 'lms_catalog_load_failed' ? 'observed' : 'explicit',
      mutationScope: 'lms_workflow',
    },
  });
};
