import { expect, test, type Page } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

type JsonRecord = Record<string, unknown>;

const userId = 'e2e-role_user';
const profileId = 'profile-ai-e2e';

const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your AI career assistant.",
  createdAt: '2026-06-27T09:00:00.000Z',
};

const buildAssistantMessage = (
  id: string,
  content: string,
  createdAt: string,
  reviewStatus = 'draft',
) => ({
  id,
  role: 'assistant',
  content,
  createdAt,
  reviewStatus,
  sourceLabel: 'TalentSphere AI assistant',
  sourceDetail: 'Generated from a reviewed AI workflow prompt.',
  controlNote: 'This is guidance only. It does not change profile, resume, applications, learning progress, or settings.',
});

const buildUserMessage = (id: string, content: string, createdAt: string) => ({
  id,
  role: 'user',
  content,
  createdAt,
});

const buildProfileFixture = (): JsonRecord => ({
  id: profileId,
  user_id: userId,
  headline: '',
  summary: '',
  current_role: '',
  bio: '',
  location: '',
  phone: '',
  website: '',
  linkedin_url: '',
  github_url: '',
  connectionCount: 0,
  applicationCount: 0,
  created_at: '2026-06-27T09:00:00.000Z',
  updated_at: '2026-06-27T09:00:00.000Z',
  profiles: {
    id: userId,
    email: 'e2e@talentsphere.test',
    first_name: 'E2E',
    last_name: 'User',
    full_name: 'E2E User',
    avatar_url: null,
  },
  skills: [],
  experiences: [],
  educations: [],
  achievements: [],
});

const buildJobFixture = (): JsonRecord => ({
  id: 'job-ai-e2e',
  title: 'Frontend Platform Engineer',
  description: 'Build accessible product workflows.',
  companyName: 'Northstar Labs',
  company_id: 'company-ai-e2e',
  location: 'Remote',
  job_type: 'FULL_TIME',
  requirements: ['React', 'TypeScript'],
  status: 'PUBLISHED',
  posted_at: '2026-06-27T09:00:00.000Z',
  created_at: '2026-06-27T09:00:00.000Z',
});

const lmsCourses = [
  {
    id: 'course-ai-react-testing',
    title: 'React Testing for Interfaces',
    slug: 'course-ai-react-testing',
    instructorId: 'TalentSphere Academy',
    description: 'Practical UI workflow testing.',
    category: 'Frontend',
    level: 'Advanced',
    xpReward: 120,
    lessonIds: ['course-ai-react-testing-lesson-1'],
    createdAt: '2026-06-27T09:00:00.000Z',
  },
];

const eventMetadata = (event: JsonRecord): JsonRecord => (
  event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
    ? event.metadata as JsonRecord
    : {}
);

const hasAnalyticsEvent = (
  events: JsonRecord[],
  eventName: string,
  predicate: (event: JsonRecord) => boolean = () => true,
) => events.some(event => event.area === 'ai' && event.event_name === eventName && predicate(event));

const waitForAnalyticsEvent = async (
  events: JsonRecord[],
  eventName: string,
  predicate?: (event: JsonRecord) => boolean,
) => {
  await expect.poll(() => hasAnalyticsEvent(events, eventName, predicate)).toBe(true);
};

const createAiCaptures = () => ({
  chatPrompts: [] as string[],
  sessionDeletes: [] as Array<{ id?: string; userId?: string }>,
  sessionUpserts: [] as JsonRecord[],
  suggestionAudits: [] as JsonRecord[],
  suggestionUpdates: [] as Array<{ payload: JsonRecord; id?: string; userId?: string }>,
  suggestionUpserts: [] as JsonRecord[],
  analytics: [] as JsonRecord[],
});

const installAiWorkflowStubs = async (
  page: Page,
  captures: ReturnType<typeof createAiCaptures>,
  options: {
    aiChat?: (context: { payload: JsonRecord; prompt?: string }) => JsonRecord | Promise<JsonRecord>;
    aiSessions?: JsonRecord[];
  } = {},
) => {
  await installNetworkStubs(page, {
    api: {
      lmsCourses,
      lmsEnrollments: [],
      onAiChat: async (context) => {
        if (context.prompt) {
          captures.chatPrompts.push(context.prompt);
        }

        if (options.aiChat) {
          return options.aiChat(context);
        }

        return {
          data: {
            message: 'Course Search: React Testing\nReason: Practice UI workflow verification before shipping.',
          },
        };
      },
    },
    rest: {
      aiSessions: options.aiSessions || [],
      applications: [],
      automationSuggestions: [],
      companies: [],
      enrollments: [],
      experiences: [],
      jobs: [buildJobFixture()],
      profile: buildProfileFixture(),
      resumeArtifacts: [],
      resumeExportEvents: [],
      savedJobSearches: [],
      skills: [],
      onAiSessionDelete: (context) => {
        captures.sessionDeletes.push(context);
      },
      onAiSessionUpsert: (payload) => {
        captures.sessionUpserts.push(payload);
        return {
          id: typeof payload.id === 'string' ? payload.id : 'ai-session-e2e',
          user_id: typeof payload.user_id === 'string' ? payload.user_id : userId,
          title: typeof payload.title === 'string' ? payload.title : 'AI Assistant',
          messages: Array.isArray(payload.messages) ? payload.messages : [],
          last_saved_at: typeof payload.last_saved_at === 'string' ? payload.last_saved_at : '2026-06-27T10:00:00.000Z',
          created_at: '2026-06-27T09:00:00.000Z',
          updated_at: '2026-06-27T10:00:00.000Z',
        };
      },
      onAutomationSuggestionAuditInsert: (payload) => {
        captures.suggestionAudits.push(payload);
        return {
          id: typeof payload.id === 'string' ? payload.id : `ai-audit-${captures.suggestionAudits.length}`,
          ...payload,
        };
      },
      onAutomationSuggestionUpdate: (payload, context) => {
        captures.suggestionUpdates.push({ payload, ...context });
        return {
          id: context.id || 'ai-suggestion-e2e',
          user_id: context.userId || userId,
          session_id: 'ai-session-e2e',
          suggestion_type: 'chat_response',
          source_label: 'TalentSphere AI assistant',
          source_detail: 'Generated from a reviewed AI workflow prompt.',
          content: '',
          created_at: '2026-06-27T09:00:00.000Z',
          updated_at: '2026-06-27T10:00:00.000Z',
          ...payload,
        };
      },
      onAutomationSuggestionUpsert: (payload) => {
        captures.suggestionUpserts.push(payload);
        return {
          id: typeof payload.id === 'string' ? payload.id : `ai-suggestion-${captures.suggestionUpserts.length}`,
          user_id: typeof payload.user_id === 'string' ? payload.user_id : userId,
          created_at: '2026-06-27T09:00:00.000Z',
          updated_at: '2026-06-27T10:00:00.000Z',
          ...payload,
        };
      },
      onProductAnalyticsInsert: (payload) => {
        captures.analytics.push(payload);
        return {
          id: typeof payload.id === 'string' ? payload.id : `ai-analytics-${captures.analytics.length}`,
          occurred_at: typeof payload.occurred_at === 'string' ? payload.occurred_at : '2026-06-27T10:00:00.000Z',
          ...payload,
        };
      },
    },
  });
  await installE2EAuth(page, [USER_ROLES.user]);
};

const openAiAssistantWithSeed = async (
  page: Page,
  messages: JsonRecord[],
  sessionId = 'ai-session-e2e',
) => {
  await page.goto('/dashboard');
  await page.evaluate(({ nextMessages, nextSessionId, currentUserId }) => {
    window.localStorage.setItem(`talentsphere.ai.chat.${currentUserId}`, JSON.stringify({
      sessionId: nextSessionId,
      savedAt: '2026-06-27T10:00:00.000Z',
      messages: nextMessages,
    }));
  }, { nextMessages: messages, nextSessionId: sessionId, currentUserId: userId });
  await page.getByRole('link', { name: 'AI Assistant' }).click();
  await expect(page.getByRole('heading', { name: /^AI Assistant$/ })).toBeVisible();
};

test.describe('AI Assistant workflow', () => {
  test('shows long-running generation state, handles provider failure, and allows a retry', async ({ page }) => {
    const captures = createAiCaptures();
    let releaseFirstChat: (() => void) | undefined;
    let chatCallCount = 0;

    await installAiWorkflowStubs(page, captures, {
      aiChat: async () => {
        chatCallCount += 1;
        if (chatCallCount === 1) {
          await new Promise<void>((resolve) => {
            releaseFirstChat = resolve;
          });
          return {
            data: {
              message: 'Course Search: React Testing\nReason: Build confidence in UI workflow releases.',
            },
          };
        }

        if (chatCallCount === 2) {
          throw new Error('AI provider unavailable');
        }

        return {
          data: {
            message: 'Resume: Add measurable accessibility outcomes to the summary.',
          },
        };
      },
    });

    await openAiAssistantWithSeed(page, []);
    await page.getByLabel('Ask AI assistant').fill('Recommend skills to learn next');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect.poll(() => Boolean(releaseFirstChat)).toBe(true);
    await expect(page.locator('.animate-spin')).toBeVisible();
    releaseFirstChat?.();
    await expect(page.getByText('Course Search: React Testing').first()).toBeVisible();
    await expect(page.getByText('1 draft')).toBeVisible();
    await waitForAnalyticsEvent(captures.analytics, 'automation_suggestion_generated', (event) => (
      eventMetadata(event).generationState === 'success'
    ));

    await page.getByLabel('Ask AI assistant').fill('Try the same request again');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText("Sorry, I'm having trouble connecting to the AI service right now.").first()).toBeVisible();
    await waitForAnalyticsEvent(captures.analytics, 'task_failed', (event) => (
      event.source === 'ai_assistant_chat'
    ));

    await page.getByLabel('Ask AI assistant').fill('Retry with a resume-focused answer');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Resume: Add measurable accessibility outcomes to the summary.').first()).toBeVisible();
    expect(captures.chatPrompts).toEqual([
      'Recommend skills to learn next',
      'Try the same request again',
      'Retry with a resume-focused answer',
    ]);
  });

  test('persists save and dismiss reviews before clearing chat history through explicit review', async ({ page }) => {
    const captures = createAiCaptures();

    await installAiWorkflowStubs(page, captures);
    await openAiAssistantWithSeed(page, [
      welcomeMessage,
      buildUserMessage('ai-user-review-e2e', 'Review two AI recommendations', '2026-06-27T09:01:00.000Z'),
      buildAssistantMessage(
        'ai-resume-review-e2e',
        'Resume URL: https://portfolio.example/resume\nCover Letter: I can help with accessible UI workflow delivery.',
        '2026-06-27T09:02:00.000Z',
      ),
      buildAssistantMessage(
        'ai-profile-review-e2e',
        'Profile Headline: Accessibility-focused frontend engineer\nBio: I turn complex workflows into maintainable product surfaces.',
        '2026-06-27T09:03:00.000Z',
      ),
    ]);

    await expect(page.getByText('2 draft')).toBeVisible();
    await page.getByRole('button', { name: 'Save', exact: true }).first().click();
    await page.getByRole('button', { name: 'Dismiss', exact: true }).first().click();

    await expect.poll(() => captures.suggestionUpdates.map(update => update.payload.review_status)).toContain('saved');
    await expect.poll(() => captures.suggestionUpdates.map(update => update.payload.review_status)).toContain('dismissed');
    await expect.poll(() => captures.suggestionAudits.length).toBeGreaterThanOrEqual(2);
    await waitForAnalyticsEvent(captures.analytics, 'automation_suggestion_saved');
    await waitForAnalyticsEvent(captures.analytics, 'automation_suggestion_dismissed');
    await expect(page.getByText('0 draft')).toBeVisible();
    await expect(page.getByText('1 saved')).toBeVisible();
    await expect(page.getByText('1 dismissed')).toBeVisible();

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByRole('alert').getByText('Clear this AI chat history?')).toBeVisible();
    await page.getByRole('button', { name: 'Keep Chat' }).click();
    await waitForAnalyticsEvent(captures.analytics, 'task_abandoned', (event) => (
      eventMetadata(event).action === 'ai_chat_clear_cancelled'
    ));
    expect(captures.sessionDeletes).toHaveLength(0);

    await page.getByRole('button', { name: 'Clear' }).click();
    await page.getByRole('button', { name: 'Clear Chat' }).click();
    await expect(page.getByText('Ask for guidance, then review each recommendation before using it in another workflow.')).toBeVisible();
    await expect.poll(() => captures.sessionDeletes).toContainEqual({
      id: 'ai-session-e2e',
      userId,
    });
    await waitForAnalyticsEvent(captures.analytics, 'task_completed', (event) => (
      eventMetadata(event).action === 'ai_chat_cleared'
    ));
  });

  test('opens AI recommendations in the owning destination workflows without mutating data', async ({ page }) => {
    const captures = createAiCaptures();

    await installAiWorkflowStubs(page, captures);
    await openAiAssistantWithSeed(page, [
      welcomeMessage,
      buildAssistantMessage(
        'ai-profile-handoff-e2e',
        'Headline: Accessibility-focused frontend engineer\nBio: I improve high-risk product workflows.',
        '2026-06-27T09:01:00.000Z',
      ),
      buildAssistantMessage(
        'ai-resume-handoff-e2e',
        'Resume: Headline: Product-minded frontend engineer\nSummary: Built measurable accessibility improvements.',
        '2026-06-27T09:02:00.000Z',
      ),
      buildAssistantMessage(
        'ai-jobs-handoff-e2e',
        'Application note: I can help your team ship reliable interface systems.\nCover Letter: I bring practical UI workflow verification experience.',
        '2026-06-27T09:03:00.000Z',
      ),
      buildAssistantMessage(
        'ai-learning-handoff-e2e',
        'Course Search: React Testing\nSkill: Accessibility Reviews',
        '2026-06-27T09:04:00.000Z',
      ),
    ]);

    await page.getByRole('button', { name: 'Review profile draft for this AI recommendation' }).click();
    await expect(page).toHaveURL(/\/profile$/);
    const profileDraftDialog = page.getByRole('dialog', { name: 'Review AI Profile Draft' });
    await expect(profileDraftDialog).toBeVisible();
    await profileDraftDialog.getByRole('button', { name: 'Close modal' }).click();
    await page.getByRole('link', { name: 'AI Assistant' }).click();

    await page.getByRole('button', { name: 'Review resume draft for this AI recommendation' }).click();
    await expect(page).toHaveURL(/\/resume$/);
    const resumeDraftDialog = page.getByRole('dialog', { name: 'Review AI Resume Draft' });
    await expect(resumeDraftDialog).toBeVisible();
    await resumeDraftDialog.getByRole('button', { name: 'Close modal' }).click();
    await page.getByRole('link', { name: 'AI Assistant' }).click();

    await page.getByRole('button', { name: 'Open jobs for this AI recommendation' }).click();
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page.getByRole('heading', { name: 'AI application draft ready' }).first()).toBeVisible();
    await page.getByRole('link', { name: 'AI Assistant' }).click();

    await page.getByRole('button', { name: 'Review learning plan for this AI recommendation' }).click();
    await expect(page).toHaveURL(/\/lms$/);
    await expect(page.getByRole('heading', { name: 'Suggested catalog searches' })).toBeVisible();

    await expect.poll(() => captures.analytics.filter(event => event.event_name === 'automation_handoff_opened').length).toBeGreaterThanOrEqual(4);
    expect(captures.suggestionUpdates).toHaveLength(0);
  });
});
