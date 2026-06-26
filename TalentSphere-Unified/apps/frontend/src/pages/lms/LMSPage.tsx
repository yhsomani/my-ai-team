import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Play, Clock, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Search, Circle, PlayCircle, Sparkles, X, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { Tabs } from '../../components/shared/Tabs';
import { EmptyState } from '../../components/shared/EmptyState';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCourses, selectAllCourses } from '../../store/slices/lmsSlice';
import { Skeleton } from '../../components/shared/Skeleton';
import { AuraModal } from '../../components/shared/AuraModal';
import { Course, Enrollment, Lesson } from "../../types/lms";
import { lmsService, type CourseProgressFilter, type CourseQueryParams } from '../../services/lmsService';
import { useToast } from '../../components/shared/Toast';
import {
  buildLearningAiDraftSuggestion,
  hasLearningAiDraftSuggestions,
  type LearningAiDraftSource,
} from '../../lib/learningAiDrafts';
import { recordAiWorkflowPrefillDecision } from '../../lib/aiWorkflowPrefillAudit';
import {
  recordLmsWorkflowAnalytics,
  type LmsWorkflowAnalyticsAction,
} from '../../lib/lmsWorkflowAnalytics';

const coursePageSizeOptions = [6, 12, 24];
const defaultCoursePageSize = 12;
const enrollmentLoadErrorMessage = 'Your enrolled-course progress could not be refreshed. Retry when LMS sync is available.';

type LMSRouteState = {
  aiLearningDraft?: LearningAiDraftSource;
} | null;

const getLmsErrorCategory = (error: unknown) => {
  if (!error) return 'unknown_error';
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('auth') || message.includes('login')) return 'auth_required';
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) return 'network_error';
  return 'request_error';
};

const LMSPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as LMSRouteState;
  const aiLearningDraftState = routeState?.aiLearningDraft;
  const courses = useAppSelector(selectAllCourses);
  const {
    status,
    courseTotal,
    coursePageSize,
    courseOffset,
    hasNextCoursePage,
    courseNextCursor,
    error: courseError
  } = useAppSelector((state) => state.lms);

  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [coursePage, setCoursePage] = useState(1);
  const [selectedCoursePageSize, setSelectedCoursePageSize] = useState(defaultCoursePageSize);
  const [coursePageCursors, setCoursePageCursors] = useState<Record<number, string>>({});
  const [knownCourseTotal, setKnownCourseTotal] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentLoadError, setEnrollmentLoadError] = useState<string | null>(null);
  const [pendingAiLearningDraftSource, setPendingAiLearningDraftSource] = useState<LearningAiDraftSource | null>(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const lastCatalogAnalyticsKey = useRef('');
  const normalizedSearchTerm = searchTerm.trim().replace(/\s+/g, ' ');
  const courseProgressFilter: CourseProgressFilter | undefined = activeTab === 'in-progress'
    ? 'in-progress'
    : activeTab === 'completed'
      ? 'completed'
      : undefined;
  const currentCourseCursor = coursePage > 1 ? coursePageCursors[coursePage] : undefined;
  const courseQueryParams = useMemo<CourseQueryParams>(() => ({
    search: normalizedSearchTerm || undefined,
    limit: selectedCoursePageSize,
    offset: (coursePage - 1) * selectedCoursePageSize,
    ...(currentCourseCursor ? { cursor: currentCourseCursor } : {}),
    ...(courseProgressFilter ? { progress: courseProgressFilter, userId: user?.id } : {})
  }), [coursePage, courseProgressFilter, currentCourseCursor, normalizedSearchTerm, selectedCoursePageSize, user?.id]);

  const recordLmsAction = useCallback((
    action: LmsWorkflowAnalyticsAction,
    extra: Omit<Parameters<typeof recordLmsWorkflowAnalytics>[0], 'action' | 'userId'> = {}
  ) => {
    recordLmsWorkflowAnalytics({
      userId: user?.id,
      action,
      ...extra,
    });
  }, [user?.id]);

  useEffect(() => {
    dispatch(fetchCourses(courseQueryParams));
  }, [courseQueryParams, dispatch]);

  useEffect(() => {
    if (!aiLearningDraftState?.recommendationText) return;

    navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: null }
    );

    const draft = buildLearningAiDraftSuggestion(normalizedSearchTerm, aiLearningDraftState);
    if (!hasLearningAiDraftSuggestions(draft)) {
      addToast({
        type: 'info',
        title: 'Learning opened',
        message: 'No structured Course Search, Skill, or Certification fields were found, so the catalog search was not changed.',
      });
      return;
    }

    setPendingAiLearningDraftSource(aiLearningDraftState);
    recordLmsAction('lms_ai_plan_review_opened', {
      suggestionCount: draft.suggestions.length,
      hasSearch: Boolean(normalizedSearchTerm),
      searchLength: normalizedSearchTerm.length,
    });
    setActiveTab('all');
    setCoursePage(1);
    setCoursePageCursors({});
    setKnownCourseTotal(null);
    addToast({
      type: 'success',
      title: 'AI learning plan ready',
      message: 'Review the suggested catalog searches before applying one.',
    });
  }, [addToast, aiLearningDraftState, location.pathname, location.search, navigate, normalizedSearchTerm, recordLmsAction]);

  useEffect(() => {
    setCoursePage(1);
    setCoursePageCursors({});
    setKnownCourseTotal(null);
  }, [activeTab, normalizedSearchTerm, selectedCoursePageSize, user?.id]);

  const loadEnrollments = useCallback(async () => {
    if (!user?.id) {
      setEnrollments([]);
      setEnrollmentLoadError(null);
      return;
    }

    setEnrollmentLoadError(null);

    try {
      const data = await lmsService.getUserEnrollments(user.id);
      setEnrollments(data);
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
      setEnrollmentLoadError(enrollmentLoadErrorMessage);
      addToast({
        type: 'error',
        title: 'Learning progress unavailable',
        message: 'Your enrolled-course progress could not be loaded. Retry to refresh it.',
      });
    }
  }, [addToast, user?.id]);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  const enrollmentByCourseId = useMemo(() => {
    return new Map(enrollments.map((enrollment) => [enrollment.courseId, enrollment]));
  }, [enrollments]);

  const getCourseProgress = (course: Course) => {
    return enrollmentByCourseId.get(course.id)?.progress ?? course.progress ?? 0;
  };

  const getCompletedLessonIds = (course: Course) => {
    const enrollment = enrollmentByCourseId.get(course.id);
    const completed = new Set(enrollment?.completedLessonIds || []);
    course.lessons?.forEach((lesson) => {
      if (lesson.completed) completed.add(lesson.id);
    });
    return completed;
  };

  const getNextLessonInfo = (course: Course) => {
    const lessons = course.lessons || [];
    const completedLessonIds = getCompletedLessonIds(course);
    const firstIncompleteIndex = lessons.findIndex((lesson) => !completedLessonIds.has(lesson.id));
    const lessonIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;

    return {
      lesson: lessons[lessonIndex],
      lessonIndex,
      completedLessonCount: completedLessonIds.size,
      lessonCount: lessons.length,
    };
  };

  const getCourseAnalyticsContext = (course: Course) => {
    const completedLessonIds = getCompletedLessonIds(course);

    return {
      courseId: course.id,
      category: course.category,
      difficulty: course.difficulty,
      progress: getCourseProgress(course),
      lessonCount: course.lessons?.length || 0,
      completedLessonCount: completedLessonIds.size,
    };
  };

  const handleCourseClick = (course: Course, entryPoint = 'catalog_card') => {
    recordLmsAction('lms_course_opened', {
      ...getCourseAnalyticsContext(course),
      entryPoint,
    });
    setSelectedCourse(course);
    setActiveLessonIndex(getNextLessonInfo(course).lessonIndex);
    setIsModalOpen(true);
  };

  const handleEnroll = async (course: Course) => {
    if (!user) {
        recordLmsAction('lms_enroll_failed', {
          ...getCourseAnalyticsContext(course),
          errorCategory: 'auth_required',
        });
        addToast({ type: 'warning', title: 'Login Required', message: 'Please log in to enroll in courses.' });
        return;
    }

    setIsEnrolling(true);
    try {
        const enrollment = await lmsService.enrollInCourse(course.id, user.id);
        setEnrollments(prev => {
          const withoutExisting = prev.filter(item => item.courseId !== course.id);
          return [enrollment, ...withoutExisting];
        });
        setEnrollmentLoadError(null);
        recordLmsAction('lms_enroll_completed', {
          ...getCourseAnalyticsContext(course),
          progress: enrollment.progress,
        });
        addToast({
            type: 'success',
            title: 'Enrolled!',
            message: `You have successfully enrolled in ${course.title}`,
            duration: 3000
        });
        dispatch(fetchCourses(courseQueryParams)); // Refresh to show progress
    } catch (error) {
        console.error('Enrollment failed:', error);
        recordLmsAction('lms_enroll_failed', {
          ...getCourseAnalyticsContext(course),
          errorCategory: getLmsErrorCategory(error),
        });
        addToast({ type: 'error', title: 'Enrollment Failed', message: 'Please try again later.' });
    } finally {
        setIsEnrolling(false);
    }
  };

  const handleMarkLessonComplete = async () => {
    if (!user?.id || !selectedCourse) return;

    const lessons = selectedCourse.lessons || [];
    const activeLesson = lessons[activeLessonIndex];
    if (!activeLesson) return;

    let enrollment = enrollmentByCourseId.get(selectedCourse.id);
    const wasEnrolled = Boolean(enrollment);
    setIsCompletingLesson(true);

    try {
      if (!enrollment) {
        enrollment = await lmsService.enrollInCourse(selectedCourse.id, user.id);
      }

      await lmsService.markLessonComplete(enrollment.id, activeLesson.id, user.id, selectedCourse.id);

      const completedLessonIds = new Set([...(enrollment.completedLessonIds || []), activeLesson.id]);
      const nextProgress = lessons.length > 0
        ? Math.round((completedLessonIds.size / lessons.length) * 100)
        : 100;
      const updatedEnrollment: Enrollment = {
        ...enrollment,
        completedLessonIds: Array.from(completedLessonIds),
        progress: nextProgress,
        status: nextProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: nextProgress === 100 ? new Date().toISOString() : enrollment.completedAt,
      };

      setEnrollments(prev => {
        const withoutExisting = prev.filter(item => item.courseId !== selectedCourse.id);
        return [updatedEnrollment, ...withoutExisting];
      });
      setEnrollmentLoadError(null);
      setSelectedCourse(prev => prev ? {
        ...prev,
        progress: nextProgress,
        lessons: prev.lessons?.map(lesson => lesson.id === activeLesson.id ? { ...lesson, completed: true } : lesson)
      } : prev);

      const nextIncompleteAfterActive = lessons.findIndex((lesson, index) => index > activeLessonIndex && !completedLessonIds.has(lesson.id));
      const firstIncompleteIndex = lessons.findIndex((lesson) => !completedLessonIds.has(lesson.id));
      const nextLessonIndex = nextIncompleteAfterActive >= 0 ? nextIncompleteAfterActive : firstIncompleteIndex;
      if (nextLessonIndex >= 0) {
        setActiveLessonIndex(nextLessonIndex);
      }

      recordLmsAction('lms_lesson_completed', {
        ...getCourseAnalyticsContext(selectedCourse),
        lessonId: activeLesson.id,
        lessonIndex: activeLessonIndex + 1,
        completedLessonCount: completedLessonIds.size,
        progress: nextProgress,
        wasEnrolled,
        autoEnrolled: !wasEnrolled,
        completionStatus: nextProgress === 100 ? 'course_completed' : 'lesson_completed',
      });
      addToast({
        type: 'success',
        title: nextProgress === 100 ? 'Course completed' : 'Lesson completed',
        message: nextProgress === 100 ? 'You completed every lesson in this course.' : 'Your lesson progress has been saved.',
      });
      dispatch(fetchCourses(courseQueryParams));
    } catch (error) {
      console.error('Failed to complete lesson:', error);
      recordLmsAction('lms_lesson_complete_failed', {
        ...getCourseAnalyticsContext(selectedCourse),
        lessonId: activeLesson.id,
        lessonIndex: activeLessonIndex + 1,
        wasEnrolled,
        errorCategory: getLmsErrorCategory(error),
      });
      addToast({ type: 'error', title: 'Progress not saved', message: 'Your lesson is still incomplete. Please retry when LMS sync is available.' });
    } finally {
      setIsCompletingLesson(false);
    }
  };

  const filtered = courses.filter(c => {
    const searchableCourseText = [
      c.title,
      c.description,
      c.category,
      c.provider,
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !normalizedSearchTerm || searchableCourseText.includes(normalizedSearchTerm.toLowerCase());
    const progress = getCourseProgress(c);
    if (activeTab === 'in-progress') return matchesSearch && progress > 0 && progress < 100;
    if (activeTab === 'completed') return matchesSearch && progress === 100;
    return matchesSearch;
  });
  const visibleCourseTotal = typeof courseTotal === 'number' ? courseTotal : knownCourseTotal;
  const hasExactCourseTotal = visibleCourseTotal !== null;
  const courseTotalPages = hasExactCourseTotal
    ? Math.max(1, Math.ceil(visibleCourseTotal / coursePageSize))
    : Math.max(1, coursePage + (hasNextCoursePage ? 1 : 0));
  const normalizedCoursePage = hasExactCourseTotal
    ? Math.min(Math.max(1, coursePage), courseTotalPages)
    : Math.max(1, coursePage);
  const isSearchFilteredCourses = Boolean(normalizedSearchTerm);
  const isProgressFilteredCourses = activeTab !== 'all';
  const courseResultLabel = isProgressFilteredCourses
    ? `${isSearchFilteredCourses ? 'matching ' : ''}${activeTab === 'completed' ? 'completed courses' : 'in-progress courses'}`
    : isSearchFilteredCourses ? 'matching courses' : 'courses';
  const firstCourseIndex = filtered.length === 0 ? 0 : courseOffset + 1;
  const lastCourseIndex = filtered.length === 0
    ? 0
    : hasExactCourseTotal
      ? Math.min(visibleCourseTotal, courseOffset + filtered.length)
      : courseOffset + filtered.length;
  const canGoToPreviousCoursePage = normalizedCoursePage > 1;
  const canGoToNextCoursePage = hasExactCourseTotal
    ? normalizedCoursePage < courseTotalPages
    : hasNextCoursePage;

  useEffect(() => {
    const analyticsKey = [
      status,
      activeTab,
      normalizedCoursePage,
      selectedCoursePageSize,
      filtered.length,
      visibleCourseTotal ?? 'unknown',
      hasNextCoursePage,
      normalizedSearchTerm.length,
      courseError || '',
    ].join(':');

    if (lastCatalogAnalyticsKey.current === analyticsKey) return;
    if (status !== 'succeeded' && status !== 'failed') return;

    lastCatalogAnalyticsKey.current = analyticsKey;
    recordLmsAction(status === 'succeeded' ? 'lms_catalog_loaded' : 'lms_catalog_load_failed', {
      tabId: activeTab,
      pageNumber: normalizedCoursePage,
      pageSize: selectedCoursePageSize,
      resultCount: filtered.length,
      totalKnown: hasExactCourseTotal,
      hasNextPage: hasNextCoursePage,
      hasSearch: Boolean(normalizedSearchTerm),
      searchLength: normalizedSearchTerm.length,
      progressFilter: activeTab,
      errorCategory: status === 'failed' ? getLmsErrorCategory(courseError) : undefined,
    });
  }, [
    activeTab,
    courseError,
    filtered.length,
    hasExactCourseTotal,
    hasNextCoursePage,
    normalizedCoursePage,
    normalizedSearchTerm,
    recordLmsAction,
    selectedCoursePageSize,
    status,
    visibleCourseTotal,
  ]);

  useEffect(() => {
    if (status !== 'succeeded') return;

    if (typeof courseTotal === 'number') {
      setKnownCourseTotal(courseTotal);
    }

    const loadedPageSize = coursePageSize || selectedCoursePageSize;
    const loadedCoursePage = Math.floor(courseOffset / loadedPageSize) + 1;
    if (loadedCoursePage !== coursePage) return;

    setCoursePageCursors(prev => {
      const nextPage = loadedCoursePage + 1;
      if (!courseNextCursor) {
        if (!prev[nextPage]) return prev;
        const next = { ...prev };
        delete next[nextPage];
        return next;
      }

      if (prev[nextPage] === courseNextCursor) return prev;
      return { ...prev, [nextPage]: courseNextCursor };
    });
  }, [courseNextCursor, courseOffset, coursePage, coursePageSize, courseTotal, selectedCoursePageSize, status]);

  useEffect(() => {
    if (!hasExactCourseTotal) return;

    setCoursePage(currentPage => {
      const nextPage = Math.min(Math.max(1, currentPage), courseTotalPages);
      return nextPage === currentPage ? currentPage : nextPage;
    });
  }, [courseTotalPages, hasExactCourseTotal]);

  const inProgressCourses = useMemo(() => {
    return courses
      .filter((course) => {
        const progress = getCourseProgress(course);
        return progress > 0 && progress < 100;
      })
      .sort((a, b) => getCourseProgress(b) - getCourseProgress(a))
      .slice(0, 2);
  }, [courses, enrollmentByCourseId]);

  const recommendedCourses = useMemo(() => {
    const activeCategories = new Set(inProgressCourses.map((course) => course.category).filter(Boolean));
    return courses
      .filter((course) => getCourseProgress(course) === 0)
      .sort((a, b) => {
        const aMatchesCategory = a.category && activeCategories.has(a.category) ? 1 : 0;
        const bMatchesCategory = b.category && activeCategories.has(b.category) ? 1 : 0;
        return bMatchesCategory - aMatchesCategory;
      })
      .slice(0, 3);
  }, [courses, enrollmentByCourseId, inProgressCourses]);

  const selectedEnrollment = selectedCourse ? enrollmentByCourseId.get(selectedCourse.id) : undefined;
  const selectedCourseProgress = selectedCourse ? getCourseProgress(selectedCourse) : 0;
  const selectedCourseLessons: Lesson[] = selectedCourse?.lessons || [];
  const activeLesson = selectedCourseLessons[activeLessonIndex];
  const selectedCompletedLessonIds = selectedCourse ? getCompletedLessonIds(selectedCourse) : new Set<string>();
  const isActiveLessonCompleted = activeLesson ? selectedCompletedLessonIds.has(activeLesson.id) : false;
  const pendingAiLearningDraft = useMemo(() => (
    pendingAiLearningDraftSource
      ? buildLearningAiDraftSuggestion(normalizedSearchTerm, pendingAiLearningDraftSource)
      : null
  ), [normalizedSearchTerm, pendingAiLearningDraftSource]);

  const handleApplyAiLearningSearch = (searchTerm: string) => {
    const nextSearchTerm = searchTerm.trim().replace(/\s+/g, ' ');
    if (!nextSearchTerm) return;

    if (pendingAiLearningDraft) {
      const selectedSuggestionIndex = pendingAiLearningDraft.suggestions.findIndex(
        suggestion => suggestion.searchTerm.toLowerCase() === nextSearchTerm.toLowerCase()
      );
      const selectedSuggestion = selectedSuggestionIndex >= 0
        ? pendingAiLearningDraft.suggestions[selectedSuggestionIndex]
        : undefined;
      recordAiWorkflowPrefillDecision({
        userId: user?.id,
        suggestionId: pendingAiLearningDraft.recommendationId,
        workflow: 'learning',
        decision: 'used',
        sourceLabel: pendingAiLearningDraft.sourceLabel,
        metadata: {
          decisionReason: 'apply_search',
          suggestionLabel: selectedSuggestion?.label,
          selectedSuggestionIndex: selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : undefined,
          suggestionCount: pendingAiLearningDraft.suggestions.length,
        },
      });
      recordLmsAction('lms_ai_search_applied', {
        suggestionCount: pendingAiLearningDraft.suggestions.length,
        suggestionLabel: selectedSuggestion?.label,
        selectedSuggestionIndex: selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : undefined,
        hasSearch: true,
        searchLength: nextSearchTerm.length,
      });
    }

    setSearchTerm(nextSearchTerm);
    setActiveTab('all');
    setCoursePage(1);
    setCoursePageCursors({});
    setKnownCourseTotal(null);
    setPendingAiLearningDraftSource(null);
    addToast({
      type: 'success',
      title: 'Learning search applied',
      message: `Catalog search changed to "${nextSearchTerm}". Review courses before enrolling.`,
    });
  };

  const handleDismissAiLearningDraft = () => {
    if (pendingAiLearningDraft) {
      recordAiWorkflowPrefillDecision({
        userId: user?.id,
        suggestionId: pendingAiLearningDraft.recommendationId,
        workflow: 'learning',
        decision: 'rejected',
        sourceLabel: pendingAiLearningDraft.sourceLabel,
        metadata: {
          decisionReason: 'dismiss',
          suggestionCount: pendingAiLearningDraft.suggestions.length,
        },
      });
      recordLmsAction('lms_ai_plan_dismissed', {
        suggestionCount: pendingAiLearningDraft.suggestions.length,
      });
    }
    setPendingAiLearningDraftSource(null);
    addToast({
      type: 'info',
      title: 'AI learning plan dismissed',
      message: 'No catalog search, enrollment, or lesson progress changed.',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning"
        description="Develop your skills with structured courses and hands-on projects."
      />

      {pendingAiLearningDraft && hasLearningAiDraftSuggestions(pendingAiLearningDraft) && (
        <section
          aria-labelledby="ai-learning-draft-title"
          className="rounded-lg border border-accent/30 bg-accent/5 p-4"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">
                  <Sparkles size={12} className="mr-1" />
                  AI learning plan
                </Badge>
                <Badge variant="outline">Review before enrolling</Badge>
              </div>
              <div>
                <h2 id="ai-learning-draft-title" className="text-sm font-semibold text-[var(--text-primary)]">
                  Suggested catalog searches
                </h2>
                <p className="mt-1 max-w-2xl text-xs text-[var(--text-secondary)]">
                  Source: {pendingAiLearningDraft.sourceLabel || 'TalentSphere AI assistant'}. Applying a suggestion changes the course search only; enrollment stays separate.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleDismissAiLearningDraft}>
              <X size={14} className="mr-1" />
              Dismiss
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pendingAiLearningDraft.suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.searchTerm}-${index}`}
                className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-3"
              >
                <div className="flex h-full flex-col justify-between gap-3">
                  <div className="space-y-2">
                    <Badge variant="outline">{suggestion.label}</Badge>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{suggestion.searchTerm}</p>
                    {suggestion.reason && (
                      <p className="line-clamp-3 text-xs text-[var(--text-secondary)]">{suggestion.reason}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => handleApplyAiLearningSearch(suggestion.searchTerm)}
                    aria-label={`Apply learning search ${suggestion.searchTerm}`}
                  >
                    <Search size={14} className="mr-1" />
                    Apply Search
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {enrollmentLoadError && (
        <section
          aria-labelledby="learning-progress-unavailable-title"
          role="status"
          aria-live="polite"
          className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
              <div className="space-y-1">
                <h2 id="learning-progress-unavailable-title" className="text-sm font-semibold text-[var(--text-primary)]">
                  Learning progress unavailable
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  {enrollments.length > 0
                    ? 'Existing progress is still shown, but it may be out of date. Retry to refresh your enrolled courses.'
                    : enrollmentLoadError}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={loadEnrollments} className="w-full sm:w-auto">
              <RefreshCw size={14} className="mr-1" />
              Retry Progress
            </Button>
          </div>
        </section>
      )}

      {status === 'succeeded' && (inProgressCourses.length > 0 || recommendedCourses.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4">
          {inProgressCourses.length > 0 && (
            <section className="space-y-3" aria-labelledby="continue-learning-heading">
              <div className="flex items-center justify-between gap-3">
                <h2 id="continue-learning-heading" className="text-sm font-semibold text-[var(--text-primary)]">Continue Learning</h2>
                <Badge variant="outline">{inProgressCourses.length} active</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {inProgressCourses.map((course) => {
                  const progress = getCourseProgress(course);
                  const nextLessonInfo = getNextLessonInfo(course);
                  return (
                    <Card key={course.id} className="p-4">
                      <div className="flex h-full flex-col justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wide text-accent">{course.category || 'Course'}</p>
                              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{course.title}</h3>
                            </div>
                            <Badge variant="outline">{progress}%</Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[var(--text-muted)]">Next lesson</span>
                              <span className="text-[var(--text-secondary)]">
                                {nextLessonInfo.completedLessonCount}/{nextLessonInfo.lessonCount || 0}
                              </span>
                            </div>
                            <p className="truncate text-xs text-[var(--text-secondary)]">
                              {nextLessonInfo.lesson?.title || 'Course review'}
                            </p>
                            <div className="h-1.5 rounded-full bg-[var(--border-default)]">
                              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </div>
                        <Button size="sm" className="w-full" onClick={() => handleCourseClick(course, 'continue_learning')}>
                          <Play size={14} className="mr-1" />
                          Resume
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {recommendedCourses.length > 0 && (
            <section className="space-y-3" aria-labelledby="recommended-learning-heading">
              <div className="flex items-center justify-between gap-3">
                <h2 id="recommended-learning-heading" className="text-sm font-semibold text-[var(--text-primary)]">Recommended Next</h2>
                <Badge variant="outline">Catalog</Badge>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {recommendedCourses.map((course) => (
                  <Card key={course.id} className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{course.category || 'Course'}</Badge>
                          {course.difficulty && <span className="text-xs text-[var(--text-muted)]">{course.difficulty}</span>}
                        </div>
                        <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{course.title}</h3>
                        <p className="line-clamp-2 text-xs text-[var(--text-muted)]">{course.description || 'Build another skill from the course catalog.'}</p>
                      </div>
                      <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => handleCourseClick(course, 'recommended_next')}>
                        Start
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: 'all', label: 'All Courses' },
            { id: 'in-progress', label: 'In Progress' },
            { id: 'completed', label: 'Completed' },
          ]}
          activeTab={activeTab}
          onTabChange={(nextTab) => {
            recordLmsAction('lms_tab_selected', {
              tabId: nextTab,
              hasSearch: Boolean(normalizedSearchTerm),
              searchLength: normalizedSearchTerm.length,
            });
            setActiveTab(nextTab);
            setCoursePage(1);
          }}
        />
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <input
            type="text"
            placeholder="Search courses..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCoursePage(1);
            }}
            onBlur={() => {
              recordLmsAction('lms_search_submitted', {
                tabId: activeTab,
                hasSearch: Boolean(normalizedSearchTerm),
                searchLength: normalizedSearchTerm.length,
              });
            }}
          />
        </div>
      </div>

      {status !== 'loading' && filtered.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" aria-live="polite" className="text-xs text-[var(--text-secondary)]">
            Showing <span className="font-medium text-[var(--text-primary)]">{firstCourseIndex}-{lastCourseIndex}</span>
            {hasExactCourseTotal ? (
              <>
                {' '}of <span className="font-medium text-[var(--text-primary)]">{visibleCourseTotal}</span>
              </>
            ) : null}
            {' '}{courseResultLabel}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="course-page-size" className="text-xs font-medium text-[var(--text-secondary)]">Per page</label>
            <select
              id="course-page-size"
              aria-label="Courses per page"
              className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              value={selectedCoursePageSize}
              onChange={(event) => {
                const nextPageSize = Number(event.target.value);
                recordLmsAction('lms_page_size_changed', {
                  tabId: activeTab,
                  pageNumber: 1,
                  pageSize: nextPageSize,
                  hasSearch: Boolean(normalizedSearchTerm),
                  searchLength: normalizedSearchTerm.length,
                  progressFilter: activeTab,
                });
                setSelectedCoursePageSize(nextPageSize);
                setCoursePage(1);
              }}
            >
              {coursePageSizeOptions.map(pageSize => (
                <option key={pageSize} value={pageSize}>{pageSize}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const nextPage = Math.max(1, normalizedCoursePage - 1);
                  recordLmsAction('lms_course_page_changed', {
                    tabId: activeTab,
                    pageNumber: nextPage,
                    pageSize: selectedCoursePageSize,
                    entryPoint: 'previous_page',
                    hasSearch: Boolean(normalizedSearchTerm),
                    searchLength: normalizedSearchTerm.length,
                    progressFilter: activeTab,
                  });
                  setCoursePage(nextPage);
                }}
                disabled={!canGoToPreviousCoursePage}
                aria-label="Previous course page"
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="min-w-16 text-center text-xs text-[var(--text-secondary)]">
                Page {normalizedCoursePage}{hasExactCourseTotal ? ` of ${courseTotalPages}` : ''}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const nextPage = Math.min(courseTotalPages, normalizedCoursePage + 1);
                  recordLmsAction('lms_course_page_changed', {
                    tabId: activeTab,
                    pageNumber: nextPage,
                    pageSize: selectedCoursePageSize,
                    entryPoint: 'next_page',
                    hasSearch: Boolean(normalizedSearchTerm),
                    searchLength: normalizedSearchTerm.length,
                    progressFilter: activeTab,
                  });
                  setCoursePage(nextPage);
                }}
                disabled={!canGoToNextCoursePage}
                aria-label="Next course page"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {status === 'loading' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="p-5 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-9 w-full mt-4" />
            </Card>
          ))}
        </div>
      ) : status === 'failed' ? (
        <EmptyState
          title="Unable to load courses"
          description="We couldn't connect to the course catalog. Please check your connection and try again."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No courses found" description="Try adjusting your search or filters." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => {
            const progress = getCourseProgress(course);
            const lessonCount = course.lessons?.length || 0;
            return (
              <Card key={course.id} className="p-5 flex flex-col justify-between hover:border-[var(--border-strong)] transition-colors">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <Badge variant={progress === 100 ? 'success' : 'outline'}>{course.category}</Badge>
                    <Badge variant="outline">{course.difficulty}</Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">{course.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] mb-2 line-clamp-2">{course.description}</p>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1"><Clock size={12} /> {course.duration}</span>
                      <span className="flex items-center gap-1"><BookOpen size={12} /> {lessonCount} lessons</span>
                      {course.xp && <span className="flex items-center gap-1 text-accent font-medium">+{course.xp} XP</span>}
                    </div>
                    {course.provider && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">by {course.provider}</p>
                    )}
                  </div>
                  {progress > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[var(--text-muted)]">Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--border-default)]">
                        <div
                          className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-success' : 'bg-accent'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                  <Button
                    variant={progress === 100 ? 'secondary' : 'default'}
                    size="sm"
                    className="w-full"
                    onClick={() => handleCourseClick(course, 'catalog_card')}
                  >
                    {progress === 100 ? (
                      <><CheckCircle2 size={14} className="mr-1" /> Review</>
                    ) : progress > 0 ? (
                      <><Play size={14} className="mr-1" /> Continue</>
                    ) : (
                      <><Play size={14} className="mr-1" /> Start Course</>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AuraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCourse?.title || 'Course Details'}
        size="xl"
      >
        {selectedCourse && (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{selectedCourse.category}</Badge>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Clock size={12} /> {selectedCourse.duration}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Description</h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {selectedCourse.description}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[var(--text-muted)]">Course Progress</span>
                <span className="font-medium">{selectedCourseProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[var(--border-default)]">
                <div
                  className={`h-full rounded-full transition-all ${selectedCourseProgress === 100 ? 'bg-success' : 'bg-accent'}`}
                  style={{ width: `${selectedCourseProgress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-3">Curriculum</h4>
                <div className="space-y-2">
                  {selectedCourseLessons.length > 0 ? selectedCourseLessons.map((lesson, i) => {
                    const isCompleted = selectedCompletedLessonIds.has(lesson.id);
                    return (
                      <button
                        key={lesson.id || i}
                        type="button"
                        onClick={() => {
                          recordLmsAction('lms_lesson_selected', {
                            ...getCourseAnalyticsContext(selectedCourse),
                            lessonId: lesson.id,
                            lessonIndex: i + 1,
                            entryPoint: 'curriculum',
                          });
                          setActiveLessonIndex(i);
                        }}
                        className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors ${
                          activeLessonIndex === i
                            ? 'border-accent bg-accent/5'
                            : 'border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-[10px] font-bold text-[var(--text-muted)] w-4">{i + 1}</div>
                          <div className="min-w-0">
                            <span className="block text-sm truncate">{lesson.title}</span>
                            {lesson.durationMinutes && (
                              <span className="text-[10px] text-[var(--text-muted)]">{lesson.durationMinutes} min</span>
                            )}
                          </div>
                        </div>
                        {isCompleted ? (
                          <CheckCircle2 size={16} className="text-success shrink-0" />
                        ) : (
                          <Circle size={16} className="text-[var(--text-muted)] shrink-0" />
                        )}
                      </button>
                    );
                  }) : (
                    <p className="text-sm text-[var(--text-muted)]">No lessons are available for this course yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 min-h-72">
                {activeLesson ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Lesson {activeLessonIndex + 1}</p>
                        <h4 className="text-base font-semibold">{activeLesson.title}</h4>
                      </div>
                      <Badge variant={isActiveLessonCompleted ? 'success' : 'outline'}>
                        {isActiveLessonCompleted ? 'Complete' : 'Ready'}
                      </Badge>
                    </div>

                    {activeLesson.videoUrl ? (
                      <div className="aspect-video rounded-lg border border-[var(--border-default)] bg-black/20 flex items-center justify-center text-sm text-[var(--text-muted)]">
                        Video content opens from the lesson source.
                      </div>
                    ) : (
                      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-3">
                          <PlayCircle size={20} />
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                          {activeLesson.content || 'Lesson content is not available yet. Review the course material from your provider, then mark this lesson complete when finished.'}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={handleMarkLessonComplete}
                        disabled={isActiveLessonCompleted || isCompletingLesson}
                        isLoading={isCompletingLesson}
                      >
                        <CheckCircle2 size={14} className="mr-1.5" />
                        {isActiveLessonCompleted ? 'Lesson Complete' : selectedEnrollment ? 'Mark Complete' : 'Enroll and Complete'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No lesson selected"
                    description="Select a lesson from the curriculum to begin."
                    icon={<BookOpen size={24} />}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isEnrolling}>Close</Button>
              {!selectedEnrollment && (
                <Button onClick={() => handleEnroll(selectedCourse)} isLoading={isEnrolling}>
                  Enroll Now
                </Button>
              )}
            </div>
          </div>
        )}
      </AuraModal>
    </div>
  );
};

export default LMSPage;
