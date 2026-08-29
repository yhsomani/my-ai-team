import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import { lmsService } from '../../services/lmsService';
import authReducer from '../../store/slices/authSlice';
import lmsReducer from '../../store/slices/lmsSlice';
import type { Course, Enrollment } from '../../types/lms';
import LMSPage from './LMSPage';

vi.mock('../../services/lmsService', () => ({
  lmsService: {
    getCoursesPage: vi.fn(),
    getUserEnrollments: vi.fn(),
    enrollInCourse: vi.fn(),
    markLessonComplete: vi.fn(),
  },
}));

vi.mock('../../lib/lmsWorkflowAnalytics', () => ({
  recordLmsWorkflowAnalytics: vi.fn(),
}));

vi.mock('../../lib/aiWorkflowPrefillAudit', () => ({
  recordAiWorkflowPrefillDecision: vi.fn(),
}));

const courseFixture: Course = {
  id: 'course-resilient-catalogs',
  title: 'Resilient Course Catalogs',
  slug: 'resilient-course-catalogs',
  provider: 'TalentSphere Academy',
  status: 'NOT_STARTED',
  progress: 0,
  description: 'Build catalog experiences that recover without changing learner progress.',
  xp: 120,
  category: 'Frontend',
  duration: '30 min',
  difficulty: 'Advanced',
  lessons: [
    {
      id: 'lesson-retry-contracts',
      courseId: 'course-resilient-catalogs',
      title: 'Retry contracts',
      content: '',
      orderIndex: 1,
      durationMinutes: 15,
      isFree: true,
    },
  ],
};

const enrollmentFixture: Enrollment = {
  id: 'enrollment-resilient-catalogs',
  userId: 'learning-user',
  courseId: courseFixture.id,
  status: 'IN_PROGRESS',
  progress: 40,
  enrolledAt: '2026-06-28T00:00:00.000Z',
  completedLessonIds: [],
};

const renderLmsPage = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      lms: lmsReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'learning-user',
          email: 'learning-user@example.com',
          roles: ['ROLE_USER'],
        },
        session: null,
        loading: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/lms']}>
        <ToastProvider>
          <LMSPage />
        </ToastProvider>
      </MemoryRouter>
    </Provider>,
  );

  return store;
};

const expectDecorativeSvgIcons = (container: Element) => {
  const icons = Array.from(container.querySelectorAll('svg'));
  expect(icons.length).toBeGreaterThan(0);
  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('LMSPage', () => {
  beforeEach(() => {
    vi.mocked(lmsService.getUserEnrollments).mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows safe course catalog failure copy without exposing raw provider errors', async () => {
    vi.mocked(lmsService.getCoursesPage).mockRejectedValue(
      new Error('PostgREST course catalog failed with service_role_token=secret'),
    );

    renderLmsPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Unable to load courses' })).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Learning' })).toBeTruthy();
    expect(screen.getByText(/course catalog did not respond/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry Courses' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/PostgREST course catalog failed/i)).toBeNull();
    expectDecorativeSvgIcons(document.body);
  });

  it('retries the existing course catalog workflow from the safe failure state', async () => {
    vi.mocked(lmsService.getCoursesPage)
      .mockRejectedValueOnce(new Error('Course provider timeout with service_role_token=secret'))
      .mockResolvedValue({
        courses: [courseFixture],
        total: 1,
        limit: 12,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      });

    renderLmsPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry Courses' })).toBeTruthy();
    });

    const requestCountBeforeRetry = vi.mocked(lmsService.getCoursesPage).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry Courses' }));

    await waitFor(() => {
      expect(lmsService.getCoursesPage).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Resilient Course Catalogs' }).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('Unable to load courses')).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe progress load failure copy without exposing raw provider errors', async () => {
    vi.mocked(lmsService.getCoursesPage).mockResolvedValue({
      courses: [courseFixture],
      total: 1,
      limit: 12,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    });
    vi.mocked(lmsService.getUserEnrollments).mockRejectedValue(
      new Error('PostgREST enrollment progress failed with service_role_token=secret'),
    );

    renderLmsPage();

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Learning progress unavailable' }).length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('heading', { name: 'Learning' })).toBeTruthy();
    expect(screen.getByText(/your enrolled-course progress could not be refreshed/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry Progress' })).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: 'Resilient Course Catalogs' }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/PostgREST enrollment progress failed/i)).toBeNull();
  });

  it('retries the existing progress load workflow from the safe failure state', async () => {
    vi.mocked(lmsService.getCoursesPage).mockResolvedValue({
      courses: [courseFixture],
      total: 1,
      limit: 12,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    });
    vi.mocked(lmsService.getUserEnrollments)
      .mockRejectedValueOnce(new Error('Enrollment provider timeout with service_role_token=secret'))
      .mockResolvedValueOnce([enrollmentFixture]);

    renderLmsPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry Progress' })).toBeTruthy();
    });

    const requestCountBeforeRetry = vi.mocked(lmsService.getUserEnrollments).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry Progress' }));

    await waitFor(() => {
      expect(lmsService.getUserEnrollments).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.getAllByText('40%').length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole('button', { name: 'Retry Progress' })).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('exposes course progress indicators with descriptive progressbar semantics', async () => {
    vi.mocked(lmsService.getCoursesPage).mockResolvedValue({
      courses: [courseFixture],
      total: 1,
      limit: 12,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    });
    vi.mocked(lmsService.getUserEnrollments).mockResolvedValue([enrollmentFixture]);

    renderLmsPage();

    const continueProgress = await screen.findByRole('progressbar', {
      name: 'Continue Learning progress for Resilient Course Catalogs: 40% complete',
    });
    expect(continueProgress.getAttribute('aria-valuemin')).toBe('0');
    expect(continueProgress.getAttribute('aria-valuemax')).toBe('100');
    expect(continueProgress.getAttribute('aria-valuenow')).toBe('40');
    expect(continueProgress.getAttribute('aria-valuetext')).toBe('40% complete');

    const catalogSearch = screen.getByRole('search', { name: 'Learning catalog search' });
    expect(catalogSearch.getAttribute('data-ui')).toBe('learning-search-surface');
    const searchInput = screen.getByLabelText('Search courses');
    expect(catalogSearch.contains(searchInput)).toBe(true);
    expect(searchInput.getAttribute('aria-describedby')).toBe('learning-search-help');
    expect(screen.getByText(/Search narrows the visible course catalog/i).id).toBe('learning-search-help');

    const catalogControls = screen.getByRole('group', { name: 'Learning catalog controls' });
    expect(catalogControls.getAttribute('data-ui')).toBe('learning-catalog-controls');
    expect(catalogControls.getAttribute('aria-describedby')).toBe('learning-control-help');
    expect(screen.getByText(/Course tabs, page size, and pagination controls/i).id).toBe('learning-control-help');
    expect(catalogControls.contains(screen.getByLabelText('Courses per page'))).toBe(true);
    expect(catalogControls.contains(screen.getByRole('button', { name: 'Previous course page' }))).toBe(true);
    expect(catalogControls.contains(screen.getByRole('button', { name: 'Next course page' }))).toBe(true);

    const cardProgress = await screen.findByRole('progressbar', {
      name: 'Course card progress for Resilient Course Catalogs: 40% complete',
    });
    expect(cardProgress.getAttribute('aria-valuenow')).toBe('40');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const detailProgress = await screen.findByRole('progressbar', {
      name: 'Course detail progress for Resilient Course Catalogs: 40% complete',
    });
    expect(detailProgress.getAttribute('aria-valuenow')).toBe('40');
    expect(screen.getByRole('dialog', { name: 'Resilient Course Catalogs' })).toBeTruthy();
    expect(screen.getAllByLabelText('Duration 30 min').length).toBeGreaterThan(0);
    expectDecorativeSvgIcons(document.body);
  });

  it('shows safe enrollment failure copy and retries through the existing enrollment action', async () => {
    vi.mocked(lmsService.getCoursesPage).mockResolvedValue({
      courses: [courseFixture],
      total: 1,
      limit: 12,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    });
    vi.mocked(lmsService.enrollInCourse)
      .mockRejectedValueOnce(new Error('Enrollment provider failed with service_role_token=secret'))
      .mockResolvedValueOnce(enrollmentFixture);

    renderLmsPage();

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Resilient Course Catalogs' }).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start Course' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enroll Now' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enroll Now' }));

    await waitFor(() => {
      expect(screen.getByText('Enrollment Failed')).toBeTruthy();
    });

    expect(screen.getByText('Please try again later.')).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Enrollment provider failed/i)).toBeNull();
    expect(lmsService.enrollInCourse).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Enroll Now' }));

    await waitFor(() => {
      expect(lmsService.enrollInCourse).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByText('Enrolled!')).toBeTruthy();
    });
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe lesson completion failure copy and retries through the existing progress action', async () => {
    vi.mocked(lmsService.getCoursesPage).mockResolvedValue({
      courses: [courseFixture],
      total: 1,
      limit: 12,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    });
    vi.mocked(lmsService.getUserEnrollments).mockResolvedValue([enrollmentFixture]);
    vi.mocked(lmsService.markLessonComplete)
      .mockRejectedValueOnce(new Error('Lesson progress write failed with service_role_token=secret'))
      .mockResolvedValueOnce(undefined);

    renderLmsPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark Complete' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));

    await waitFor(() => {
      expect(screen.getByText('Progress not saved')).toBeTruthy();
    });

    expect(screen.getByText('Your lesson is still incomplete. Please retry when LMS sync is available.')).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Lesson progress write failed/i)).toBeNull();
    expect(lmsService.markLessonComplete).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('40%').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));

    await waitFor(() => {
      expect(lmsService.markLessonComplete).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByText('Course completed')).toBeTruthy();
    });
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });
});
