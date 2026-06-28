import { expect, test, type Page } from '@playwright/test';
import { USER_ROLES } from '../src/navigation/routeRegistry';
import { installE2EAuth, installNetworkStubs } from './helpers/e2e';

type JsonRecord = Record<string, unknown>;

const talentUserId = 'e2e-role_user';
const recruiterUserId = 'e2e-role_recruiter';

const dashboardActionSeen = (
  events: JsonRecord[],
  action: string,
  predicate: (metadata: JsonRecord, event: JsonRecord) => boolean = () => true,
) => events.some((event) => {
  const metadata = event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
    ? event.metadata as JsonRecord
    : {};
  return event.area === 'dashboard' && metadata.action === action && predicate(metadata, event);
});

const waitForDashboardAction = async (
  events: JsonRecord[],
  action: string,
  predicate?: (metadata: JsonRecord, event: JsonRecord) => boolean,
) => {
  await expect.poll(() => dashboardActionSeen(events, action, predicate)).toBe(true);
};

const installTalentDashboard = async (
  page: Page,
  events: JsonRecord[],
  options: { leaderboard?: JsonRecord | null } = {},
) => {
  await installNetworkStubs(page, {
    rest: {
      leaderboard: options.leaderboard === undefined
        ? {
            user_id: talentUserId,
            total_xp: 240,
            rank: 7,
          }
        : options.leaderboard,
      profile: {
        id: 'profile-signal-e2e',
        user_id: talentUserId,
        headline: 'Frontend platform engineer',
        location: 'Remote',
        summary: 'Builds accessible product workflows.',
        skills: [
          { name: 'React' },
          { name: 'TypeScript' },
          { name: 'Accessibility' },
        ],
      },
      applications: [
        {
          id: 'application-dashboard-e2e',
          user_id: talentUserId,
          job_id: 'job-dashboard-1',
          status: 'PENDING',
          created_at: '2026-06-27T09:00:00.000Z',
        },
      ],
      jobs: [
        {
          id: 'job-dashboard-1',
          title: 'Design Systems Engineer',
          company_id: 'company-dashboard-1',
          companyName: 'Northstar Labs',
          location: 'Remote',
          status: 'PUBLISHED',
          matchScore: 92,
          posted_at: '2026-06-27T08:00:00.000Z',
          created_at: '2026-06-27T08:00:00.000Z',
        },
      ],
      challenges: [
        {
          id: 'challenge-dashboard-1',
          title: 'Frontend Refactor Sprint',
          difficulty: 'Hard',
          participantCount: 18,
          xp_reward: 320,
          is_published: true,
          created_at: '2026-06-27T07:00:00.000Z',
        },
      ],
      conversationParticipants: [
        {
          id: 'participant-dashboard-1',
          conversation_id: 'conversation-dashboard-1',
          user_id: talentUserId,
        },
      ],
      messages: [
        {
          id: 'message-dashboard-1',
          conversation_id: 'conversation-dashboard-1',
          sender_id: 'recruiter-dashboard-1',
          content: 'Can we schedule a role discussion?',
          read_at: null,
          created_at: '2026-06-27T06:00:00.000Z',
        },
        {
          id: 'message-dashboard-2',
          conversation_id: 'conversation-dashboard-1',
          sender_id: 'recruiter-dashboard-2',
          content: 'Your challenge submission stood out.',
          read_at: null,
          created_at: '2026-06-27T05:00:00.000Z',
        },
      ],
      savedJobSearches: [],
      enrollments: [],
      challengeSubmissions: [],
      onProductAnalyticsInsert: (payload) => {
        events.push(payload);
        return {
          id: typeof payload.id === 'string' ? payload.id : `analytics-${events.length}`,
          occurred_at: typeof payload.occurred_at === 'string' ? payload.occurred_at : '2026-06-27T10:00:00.000Z',
          ...payload,
        };
      },
    },
  });
  await installE2EAuth(page, [USER_ROLES.user]);
};

const installRecruiterDashboard = async (page: Page, events: JsonRecord[]) => {
  await installNetworkStubs(page, {
    rest: {
      jobs: [
        {
          id: 'recruiter-job-1',
          title: 'Frontend Lead',
          posted_by: recruiterUserId,
          status: 'PUBLISHED',
          created_at: '2026-06-27T09:00:00.000Z',
        },
        {
          id: 'recruiter-job-2',
          title: 'Data Platform Engineer',
          posted_by: recruiterUserId,
          status: 'DRAFT',
          created_at: '2026-06-26T09:00:00.000Z',
        },
      ],
      companies: [
        {
          id: 'company-recruiter-1',
          owner_user_id: recruiterUserId,
          name: 'Northstar Labs',
        },
      ],
      applications: [
        {
          id: 'application-recruiter-1',
          user_id: 'candidate-1',
          job_id: 'recruiter-job-1',
          status: 'PENDING',
          created_at: '2026-06-27T08:00:00.000Z',
          profiles: {
            full_name: 'Mira Patel',
            email: 'mira@example.test',
          },
          jobs: {
            title: 'Frontend Lead',
          },
        },
        {
          id: 'application-recruiter-2',
          user_id: 'candidate-2',
          job_id: 'recruiter-job-2',
          status: 'OFFER',
          created_at: '2026-06-27T07:00:00.000Z',
          profiles: {
            full_name: 'Owen Kim',
            email: 'owen@example.test',
          },
          jobs: {
            title: 'Data Platform Engineer',
          },
        },
      ],
      onProductAnalyticsInsert: (payload) => {
        events.push(payload);
        return {
          id: typeof payload.id === 'string' ? payload.id : `analytics-${events.length}`,
          occurred_at: typeof payload.occurred_at === 'string' ? payload.occurred_at : '2026-06-27T10:00:00.000Z',
          ...payload,
        };
      },
    },
  });
  await installE2EAuth(page, [USER_ROLES.recruiter]);
};

test.describe('Dashboard workflow', () => {
  test('keeps the talent dashboard as a summary launchpad with explicit handoffs', async ({ page }) => {
    const analyticsEvents: JsonRecord[] = [];
    await installTalentDashboard(page, analyticsEvents);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();
    await expect(page.getByText('Dashboard data refreshed.')).toBeVisible();
    await expect(page.getByText('Live')).toBeVisible();
    await expect(page.getByText('Design Systems Engineer')).toBeVisible();
    await expect(page.getByText('Frontend Refactor Sprint')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Applications: 1. View applications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Messages: 2. Open messages' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'XP Earned: 240. Earn more XP' })).toBeVisible();
    await expect(page.getByText('2/5')).toBeVisible();
    await waitForDashboardAction(analyticsEvents, 'dashboard_data_loaded', metadata => metadata.role === 'talent');

    await page.getByRole('button', { name: /^Browse Jobs$/ }).click();
    await expect(page).toHaveURL(/\/jobs$/);
    await waitForDashboardAction(analyticsEvents, 'dashboard_primary_action_opened', metadata => (
      metadata.entryPoint === 'header_browse_jobs' && metadata.route === '/jobs'
    ));

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Applications: 1. View applications' }).click();
    await expect(page).toHaveURL(/\/jobs\?tab=applied$/);
    await waitForDashboardAction(analyticsEvents, 'dashboard_stat_card_opened', metadata => (
      metadata.statKey === 'applications' && metadata.route === '/jobs?tab=applied'
    ));

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Continue learning' }).click();
    await expect(page).toHaveURL(/\/lms$/);
    await waitForDashboardAction(analyticsEvents, 'dashboard_quick_action_opened', metadata => (
      metadata.entryPoint === 'quick_action_continue_learning' && metadata.route === '/lms'
    ));
  });

  test('shows partial talent dashboard state and records retry recovery intent', async ({ page }) => {
    const analyticsEvents: JsonRecord[] = [];
    await installTalentDashboard(page, analyticsEvents, { leaderboard: null });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Welcome back, E2E User$/ })).toBeVisible();
    await expect(page.getByText('Some dashboard sections could not refresh.')).toBeVisible();
    await expect(page.getByText('Partially refreshed', { exact: true })).toBeVisible();
    await expect(page.getByText(/XP and level did not refresh/)).toBeVisible();
    await waitForDashboardAction(analyticsEvents, 'dashboard_degraded_state_shown', metadata => (
      metadata.role === 'talent' && metadata.sourceStatus === 'partial'
    ));

    await page.getByRole('button', { name: 'Retry affected' }).click();
    await expect(page.getByText('Some dashboard sections could not refresh.')).toBeVisible();
    await waitForDashboardAction(analyticsEvents, 'dashboard_retry_clicked', metadata => (
      metadata.entryPoint === 'status_retry' && metadata.sourceStatus === 'partial'
    ));
  });

  test('keeps the recruiter dashboard focused on summary metrics and owned workflow handoffs', async ({ page }) => {
    const analyticsEvents: JsonRecord[] = [];
    await installRecruiterDashboard(page, analyticsEvents);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Recruiter Console$/ })).toBeVisible();
    await expect(page.getByText('Recruiter dashboard data refreshed.')).toBeVisible();
    await expect(page.getByText('Live')).toBeVisible();
    await expect(page.getByText('Mira Patel')).toBeVisible();
    await expect(page.getByText('Applied for Frontend Lead')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Active Jobs: 2. Open recruiter jobs' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Total Applicants: 2. Review all applicants' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Offers: 1. Review offer-stage candidates' })).toBeVisible();
    await waitForDashboardAction(analyticsEvents, 'dashboard_data_loaded', metadata => metadata.role === 'recruiter');

    await page.getByRole('button', { name: /^Post a Job$/ }).click();
    await expect(page).toHaveURL(/\/jobs\/post$/);
    await waitForDashboardAction(analyticsEvents, 'dashboard_primary_action_opened', metadata => (
      metadata.entryPoint === 'header_post_job' && metadata.route === '/jobs/post'
    ));

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Recruiter Console$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Total Applicants: 2. Review all applicants' }).click();
    await expect(page).toHaveURL(/\/candidates$/);
    await waitForDashboardAction(analyticsEvents, 'dashboard_stat_card_opened', metadata => (
      metadata.statKey === 'total_applicants' && metadata.route === '/candidates'
    ));

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /^Recruiter Console$/ })).toBeVisible();
    await page.getByRole('button', { name: 'Message candidates' }).click();
    await expect(page).toHaveURL(/\/messaging$/);
    await waitForDashboardAction(analyticsEvents, 'dashboard_quick_action_opened', metadata => (
      metadata.entryPoint === 'quick_action_message_candidates' && metadata.route === '/messaging'
    ));
  });
});
