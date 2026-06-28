import { expect, test, type Page } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

type JsonRecord = Record<string, unknown>;

const userId = 'e2e-role_user';

const lmsCourses: JsonRecord[] = [
  {
    id: 'course-career-platform-lead',
    title: 'Frontend Platform Leadership',
    slug: 'course-career-platform-lead',
    instructorId: 'TalentSphere Academy',
    description: 'Practice technical leadership for accessible frontend platforms.',
    category: 'Leadership',
    level: 'Advanced',
    xpReward: 180,
    lessonIds: ['course-career-platform-lead-lesson-1'],
    createdAt: '2026-06-27T09:00:00.000Z',
  },
];

const generatedCareerPath = {
  recommendedPath: 'Frontend Platform Lead',
  estimatedTimeline: '6-9 months',
  requiredSkills: ['React systems', 'Accessibility reviews', 'Product analytics'],
  milestones: [
    { label: 'Audit current UI workflows', done: true },
    { label: 'Choose one advanced learning path', done: false },
    'Review architecture evidence before changing durable records',
  ],
};

const installCareerPathStubs = async (
  page: Page,
  captures: { requests: Array<{ userId?: string }> },
  handler: (context: { userId?: string }) => JsonRecord | Promise<JsonRecord>,
) => {
  await installNetworkStubs(page, {
    api: {
      lmsCourses,
      lmsEnrollments: [],
      onAiCareerPath: async (context) => {
        captures.requests.push(context);
        return handler(context);
      },
    },
    rest: {
      aiSessions: [],
      automationSuggestions: [],
      automationSuggestionAuditEvents: [],
    },
  });
  await installE2EAuth(page, [USER_ROLES.user]);
};

test.describe('Career Path workflow', () => {
  test('renders generated guidance and keeps follow-up actions in owning workflows', async ({ page }) => {
    const captures = { requests: [] as Array<{ userId?: string }> };
    await installCareerPathStubs(page, captures, () => ({ data: generatedCareerPath }));

    await page.goto('/career-path');

    await expect(page.getByRole('heading', { name: /^Career Paths$/ })).toBeVisible();
    await expect(page.getByText('Generated Guidance', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Frontend Platform Lead' })).toBeVisible();
    await expect(page.getByText('6-9 months')).toBeVisible();
    await expect(page.getByText('React systems')).toBeVisible();
    await expect(page.getByText('Accessibility reviews')).toBeVisible();
    await expect(page.getByText('Audit current UI workflows')).toBeVisible();
    await expect(page.getByText('Review Boundaries')).toBeVisible();
    await expect(page.getByText('Generated guidance does not change your profile')).toBeVisible();
    await expect.poll(() => captures.requests.length).toBeGreaterThanOrEqual(1);
    expect(captures.requests.every(request => request.userId === userId)).toBe(true);

    await page.getByRole('button', { name: /Explore Path/ }).click();
    await expect(page).toHaveURL(/\/lms$/);
    await expect(page.getByRole('heading', { name: /^Learning$/ })).toBeVisible();

    await page.goto('/career-path');
    await page.getByRole('button', { name: 'Ask AI Assistant' }).click();
    await expect(page).toHaveURL(/\/ai$/);
    await expect(page.getByRole('heading', { name: /^AI Assistant$/ })).toBeVisible();
  });

  test('shows incomplete generated data as retryable and succeeds on retry', async ({ page }) => {
    const captures = { requests: [] as Array<{ userId?: string }> };
    let requestCount = 0;
    await installCareerPathStubs(page, captures, () => {
      requestCount += 1;
      if (requestCount <= 2) {
        return {
          data: {
            estimatedTimeline: '3 months',
            requiredSkills: ['Missing path title should not be accepted'],
            milestones: ['Review unavailable state'],
          },
        };
      }

      return { data: generatedCareerPath };
    });

    await page.goto('/career-path');

    await expect(page.getByRole('alert')).toContainText('Career path is not ready');
    await expect(page.getByText('Career path data was incomplete. Retry generation or open the AI Assistant for guided planning.')).toBeVisible();
    await page.getByRole('button', { name: 'Retry' }).click();

    await expect(page.getByRole('heading', { name: 'Frontend Platform Lead' })).toBeVisible();
    await expect(page.getByText('Generated Guidance', { exact: true })).toBeVisible();
    await expect.poll(() => captures.requests.length).toBeGreaterThanOrEqual(3);
  });

  test('shows provider unavailable state and routes to AI Assistant without applying changes', async ({ page }) => {
    const captures = { requests: [] as Array<{ userId?: string }> };
    await installCareerPathStubs(page, captures, () => {
      throw new Error('AI career path provider unavailable');
    });

    await page.goto('/career-path');

    await expect(page.getByRole('alert')).toContainText('Career path is not ready');
    await expect(page.getByText('Career-path provider did not respond. Retry career path to reload generated guidance, required skills, milestones, and review-first handoffs.')).toBeVisible();
    await expect(page.getByText('Needs data')).toBeVisible();
    await page.getByRole('button', { name: 'Ask AI Assistant' }).click();

    await expect(page).toHaveURL(/\/ai$/);
    await expect(page.getByRole('heading', { name: /^AI Assistant$/ })).toBeVisible();
    await expect.poll(() => captures.requests.length).toBeGreaterThanOrEqual(1);
    expect(captures.requests.every(request => request.userId === userId)).toBe(true);
  });
});
