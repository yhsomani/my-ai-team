import { expect, test, type Page } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

const currentUserId = 'e2e-role_user';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const courseCards = (page: Page, title: string) => page
  .locator('.surface-card')
  .filter({ hasText: new RegExp(escapeRegExp(title)) });

const catalogCourseCard = (page: Page, title: string) => courseCards(page, title).last();

const buildGatewayCourse = ({
  id,
  title,
  category,
  level = 'Normal',
  lessonCount = 2,
}: {
  id: string;
  title: string;
  category: string;
  level?: string;
  lessonCount?: number;
}) => ({
  id,
  title,
  slug: id,
  instructorId: 'TalentSphere Academy',
  description: `${title} course for practical career growth.`,
  xpReward: 120,
  category,
  level,
  lessonIds: Array.from({ length: lessonCount }, (_, index) => `${id}-lesson-${index + 1}`),
  createdAt: `2026-06-${String(27 - Number(id.replace(/\D/g, '').slice(-1) || 0)).padStart(2, '0')}T10:00:00.000Z`,
});

const lmsCourses = [
  buildGatewayCourse({
    id: 'course-react-testing',
    title: 'React Testing for Interfaces',
    category: 'Frontend',
    level: 'Advanced',
  }),
  buildGatewayCourse({
    id: 'course-react-foundations',
    title: 'React Foundations',
    category: 'Frontend',
  }),
  buildGatewayCourse({
    id: 'course-design-systems',
    title: 'Design Systems Essentials',
    category: 'Design',
  }),
  buildGatewayCourse({
    id: 'course-accessibility',
    title: 'Accessibility Reviews',
    category: 'Design',
  }),
  buildGatewayCourse({
    id: 'course-product-analytics',
    title: 'Product Analytics Basics',
    category: 'Product',
  }),
  buildGatewayCourse({
    id: 'course-api-contracts',
    title: 'API Contract Testing',
    category: 'Engineering',
  }),
  buildGatewayCourse({
    id: 'course-automation',
    title: 'Workflow Automation',
    category: 'Operations',
  }),
  buildGatewayCourse({
    id: 'course-data-modeling',
    title: 'Data Modeling',
    category: 'Engineering',
  }),
  buildGatewayCourse({
    id: 'course-cloud-security',
    title: 'Cloud Security',
    category: 'Security',
  }),
  buildGatewayCourse({
    id: 'course-interview-prep',
    title: 'Interview Prep Systems',
    category: 'Career',
  }),
  buildGatewayCourse({
    id: 'course-collaboration',
    title: 'Collaboration Rituals',
    category: 'Leadership',
  }),
  buildGatewayCourse({
    id: 'course-roadmapping',
    title: 'Roadmapping Practice',
    category: 'Product',
  }),
  buildGatewayCourse({
    id: 'course-systems-thinking',
    title: 'Systems Thinking',
    category: 'Leadership',
  }),
  buildGatewayCourse({
    id: 'course-career-growth',
    title: 'Career Growth Planning',
    category: 'Career',
  }),
];

const createMutableLearningApi = () => {
  const enrollmentRows: Record<string, unknown>[] = [];
  const enrollmentWrites: Record<string, unknown>[] = [];
  const lessonCompletions: Array<{ courseId?: string; lessonId?: string; userId?: string }> = [];

  return {
    enrollmentRows,
    enrollmentWrites,
    lessonCompletions,
    api: {
      lmsCourses,
      lmsEnrollments: enrollmentRows,
      onLmsEnroll: ({ courseId, userId }: { courseId?: string; userId?: string }) => {
        const enrollment = {
          id: `enrollment-${courseId}`,
          userId,
          courseId,
          status: 'ENROLLED',
          progress: 0,
          enrolledAt: '2026-06-27T10:00:00.000Z',
          completedLessonIds: [],
        };
        enrollmentWrites.push({
          ...enrollment,
          completedLessonIds: [...enrollment.completedLessonIds],
        });
        enrollmentRows.unshift(enrollment);
        return enrollment;
      },
      onLmsLessonComplete: (context: { courseId?: string; lessonId?: string; userId?: string }) => {
        lessonCompletions.push(context);
        const enrollment = enrollmentRows.find(row => row.courseId === context.courseId);
        if (enrollment) {
          enrollment.status = 'IN_PROGRESS';
          enrollment.progress = 50;
          enrollment.completedLessonIds = [context.lessonId];
        }
      },
    },
  };
};

test.describe('learning workflow', () => {
  test('reviews an AI learning search and paginates the catalog without enrolling', async ({ page }) => {
    await installNetworkStubs(page, {
      api: {
        lmsCourses,
        lmsEnrollments: [],
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/dashboard');
    await page.evaluate(() => {
      window.localStorage.setItem('talentsphere.ai.chat.e2e-role_user', JSON.stringify({
        sessionId: 'ai-learning-session-e2e',
        savedAt: '2026-06-27T10:00:00.000Z',
        messages: [
          {
            id: 'ai-learning-recommendation-e2e',
            role: 'assistant',
            sourceLabel: 'TalentSphere AI assistant',
            sourceDetail: 'Generated from a reviewed AI learning prompt.',
            controlNote: 'This is guidance only. It does not change learning progress or enrollment.',
            reviewStatus: 'draft',
            createdAt: '2026-06-27T10:00:00.000Z',
            content: [
              'Course Search: React Testing Reason: Strengthen confidence in UI workflow changes.',
              'Skill: Accessibility Reviews Reason: Improve inclusive review habits.',
            ].join('\n'),
          },
        ],
      }));
    });
    await page.getByRole('link', { name: 'AI Assistant' }).click();
    await expect(page.getByRole('heading', { name: /^AI Assistant$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AI Review Queue' })).toBeVisible();
    await page.getByRole('button', { name: 'Review learning plan for this AI recommendation' }).click();

    await expect(page.getByRole('heading', { name: /^Learning$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Suggested catalog searches' })).toBeVisible();
    await page.getByRole('button', { name: 'Apply learning search React Testing' }).click();
    await expect(page.getByRole('heading', { name: 'Learning search applied' })).toBeVisible();
    await expect(page.getByLabel('Search courses')).toHaveValue('React Testing');
    await expect(page.getByRole('heading', { name: 'Suggested catalog searches' })).toBeHidden();
    await expect(catalogCourseCard(page, 'React Testing for Interfaces')).toBeVisible();
    await expect(courseCards(page, 'Cloud Security')).toHaveCount(0);

    await page.getByLabel('Search courses').fill('');
    await expect(page.getByText(/Showing 1-12 of 14 courses/)).toBeVisible();
    await page.getByLabel('Courses per page').selectOption('6');
    await expect(page.getByText(/Showing 1-6 of 14 courses/)).toBeVisible();
    await page.getByRole('button', { name: 'Next course page' }).click();
    await expect(page.getByText(/Showing 7-12 of 14 courses/)).toBeVisible();
    await expect(catalogCourseCard(page, 'Workflow Automation')).toBeVisible();
  });

  test('enrolls, completes a lesson, and keeps progress filtering in Learning', async ({ page }) => {
    const learningApi = createMutableLearningApi();
    const { enrollmentWrites, lessonCompletions } = learningApi;

    await installNetworkStubs(page, {
      api: learningApi.api,
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/lms');
    await expect(page.getByRole('heading', { name: /^Learning$/ })).toBeVisible();
    await expect(catalogCourseCard(page, 'React Testing for Interfaces')).toBeVisible();

    await catalogCourseCard(page, 'React Testing for Interfaces').getByRole('button', { name: 'Start Course' }).click();
    const courseDialog = page.getByRole('dialog', { name: 'React Testing for Interfaces' });
    await expect(courseDialog).toBeVisible();
    await expect(courseDialog.getByText('Curriculum')).toBeVisible();

    await courseDialog.getByRole('button', { name: 'Enroll Now' }).click();
    await expect.poll(() => enrollmentWrites.length).toBe(1);
    expect(enrollmentWrites[0]).toMatchObject({
      userId: currentUserId,
      courseId: 'course-react-testing',
      status: 'ENROLLED',
    });
    await expect(page.getByRole('heading', { name: 'Enrolled!' })).toBeVisible();
    await expect(courseDialog.getByRole('button', { name: 'Mark Complete' })).toBeVisible();

    await courseDialog.getByRole('button', { name: 'Mark Complete' }).click();
    await expect.poll(() => lessonCompletions.length).toBe(1);
    expect(lessonCompletions[0]).toEqual({
      courseId: 'course-react-testing',
      lessonId: 'course-react-testing-lesson-1',
      userId: currentUserId,
    });
    await expect(page.getByRole('heading', { name: 'Lesson completed' })).toBeVisible();
    await expect(courseDialog.getByText('50%')).toBeVisible();

    await courseDialog.getByRole('button', { name: 'Close modal' }).click();
    await page.getByRole('tab', { name: 'In Progress' }).click();
    await expect(page.getByText(/Showing 1-1 of 1 in-progress courses/)).toBeVisible();
    await expect(catalogCourseCard(page, 'React Testing for Interfaces')).toBeVisible();
  });

  test('supports keyboard lesson selection and completion in the Learning modal', async ({ page }) => {
    const learningApi = createMutableLearningApi();
    const { enrollmentWrites, lessonCompletions } = learningApi;

    await installNetworkStubs(page, {
      api: learningApi.api,
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/lms');
    await expect(page.getByRole('heading', { name: /^Learning$/ })).toBeVisible();

    const startCourseButton = catalogCourseCard(page, 'React Testing for Interfaces').getByRole('button', { name: 'Start Course' });
    await startCourseButton.focus();
    await expect(startCourseButton).toBeFocused();
    await page.keyboard.press('Enter');

    const courseDialog = page.getByRole('dialog', { name: 'React Testing for Interfaces' });
    await expect(courseDialog).toBeVisible();
    await expect(courseDialog.getByRole('button', { name: 'Close modal' })).toBeFocused();

    const lessonOneButton = courseDialog.getByRole('button', { name: 'Select lesson 1: Lesson 1' });
    const lessonTwoButton = courseDialog.getByRole('button', { name: 'Select lesson 2: Lesson 2' });
    await expect(lessonOneButton).toHaveAttribute('aria-current', 'step');

    await lessonTwoButton.focus();
    await expect(lessonTwoButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(courseDialog.getByRole('heading', { name: 'Lesson 2' })).toBeVisible();
    await expect(lessonTwoButton).toHaveAttribute('aria-current', 'step');

    const enrollAndCompleteButton = courseDialog.getByRole('button', { name: 'Enroll and Complete' });
    await enrollAndCompleteButton.focus();
    await expect(enrollAndCompleteButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect.poll(() => enrollmentWrites.length).toBe(1);
    await expect.poll(() => lessonCompletions.length).toBe(1);
    expect(enrollmentWrites[0]).toMatchObject({
      userId: currentUserId,
      courseId: 'course-react-testing',
      status: 'ENROLLED',
    });
    expect(lessonCompletions[0]).toEqual({
      courseId: 'course-react-testing',
      lessonId: 'course-react-testing-lesson-2',
      userId: currentUserId,
    });

    await expect(page.getByRole('heading', { name: 'Lesson completed' })).toBeVisible();
    await expect(courseDialog.getByText('50%')).toBeVisible();
    await expect(courseDialog.getByRole('button', { name: 'Select lesson 2: Lesson 2, completed' })).toBeVisible();
    await expect(lessonOneButton).toHaveAttribute('aria-current', 'step');

    await page.keyboard.press('Escape');
    await expect(courseDialog).toBeHidden();
  });

  test('keeps course review stable when enrollment persistence fails', async ({ page }) => {
    const gatewayEnrollmentAttempts: Array<{ courseId?: string; userId?: string }> = [];
    const supabaseEnrollmentAttempts: Record<string, unknown>[] = [];

    await installNetworkStubs(page, {
      api: {
        lmsCourses,
        lmsEnrollments: [],
        onLmsEnroll: (context) => {
          gatewayEnrollmentAttempts.push(context);
          throw new Error('Gateway enrollment failed in E2E fixture');
        },
      },
      rest: {
        onEnrollmentInsert: (payload) => {
          supabaseEnrollmentAttempts.push(payload);
          throw new Error('Supabase enrollment failed in E2E fixture');
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/lms');
    await expect(page.getByRole('heading', { name: /^Learning$/ })).toBeVisible();
    await catalogCourseCard(page, 'React Testing for Interfaces').getByRole('button', { name: 'Start Course' }).click();

    const courseDialog = page.getByRole('dialog', { name: 'React Testing for Interfaces' });
    await expect(courseDialog).toBeVisible();
    await expect(courseDialog.getByRole('button', { name: 'Enroll and Complete' })).toBeVisible();

    await courseDialog.getByRole('button', { name: 'Enroll Now' }).click();
    await expect.poll(() => gatewayEnrollmentAttempts.length).toBe(1);
    await expect.poll(() => supabaseEnrollmentAttempts.length).toBe(1);
    expect(gatewayEnrollmentAttempts[0]).toEqual({
      courseId: 'course-react-testing',
      userId: currentUserId,
    });
    expect(supabaseEnrollmentAttempts[0]).toMatchObject({
      course_id: 'course-react-testing',
      user_id: currentUserId,
      status: 'ENROLLED',
    });

    await expect(page.getByRole('heading', { name: 'Enrollment Failed' })).toBeVisible();
    await expect(courseDialog).toBeVisible();
    await expect(courseDialog.getByRole('button', { name: 'Enroll Now' })).toBeEnabled();
    await expect(courseDialog.getByRole('button', { name: 'Enroll and Complete' })).toBeEnabled();
    await expect(courseDialog.getByText('0%')).toBeVisible();
    await expect(courseDialog.getByRole('button', { name: 'Lesson Complete' })).toHaveCount(0);
  });

  test('keeps lesson progress unchanged when completion persistence fails', async ({ page }) => {
    const lessonCompletions: Array<{ courseId?: string; lessonId?: string; userId?: string }> = [];
    const supabaseProgressReads: Array<{ enrollmentId?: string; lessonId?: string }> = [];

    await installNetworkStubs(page, {
      api: {
        lmsCourses,
        lmsEnrollments: [
          {
            id: 'enrollment-course-react-testing',
            userId: currentUserId,
            courseId: 'course-react-testing',
            status: 'ENROLLED',
            progress: 0,
            enrolledAt: '2026-06-27T10:00:00.000Z',
            completedLessonIds: [],
          },
        ],
        onLmsLessonComplete: (context) => {
          lessonCompletions.push(context);
          throw new Error('Gateway lesson completion failed in E2E fixture');
        },
      },
      rest: {
        onLessonProgressRows: (context) => {
          supabaseProgressReads.push(context);
          throw new Error('Supabase lesson progress lookup failed in E2E fixture');
        },
      },
    });
    await installE2EAuth(page, [USER_ROLES.user]);

    await page.goto('/lms');
    await expect(page.getByRole('heading', { name: /^Learning$/ })).toBeVisible();
    await catalogCourseCard(page, 'React Testing for Interfaces').getByRole('button', { name: 'Start Course' }).click();

    const courseDialog = page.getByRole('dialog', { name: 'React Testing for Interfaces' });
    await expect(courseDialog).toBeVisible();
    await expect(courseDialog.getByRole('button', { name: 'Mark Complete' })).toBeVisible();

    await courseDialog.getByRole('button', { name: 'Mark Complete' }).click();
    await expect.poll(() => lessonCompletions.length).toBe(1);
    await expect.poll(() => supabaseProgressReads.length).toBeGreaterThan(0);
    expect(lessonCompletions[0]).toEqual({
      courseId: 'course-react-testing',
      lessonId: 'course-react-testing-lesson-1',
      userId: currentUserId,
    });
    expect(supabaseProgressReads).toContainEqual({
      enrollmentId: 'enrollment-course-react-testing',
      lessonId: 'course-react-testing-lesson-1',
    });

    await expect(page.getByRole('heading', { name: 'Progress not saved' })).toBeVisible();
    await expect(courseDialog).toBeVisible();
    await expect(courseDialog.getByRole('button', { name: 'Mark Complete' })).toBeEnabled();
    await expect(courseDialog.getByText('Ready')).toBeVisible();
    await expect(courseDialog.getByText('0%')).toBeVisible();
    await expect(courseDialog.getByRole('button', { name: 'Lesson Complete' })).toHaveCount(0);
    await expect(courseDialog.getByRole('button', { name: 'Select lesson 1: Lesson 1, completed' })).toHaveCount(0);
  });
});
