import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import { dashboardService, type DashboardData } from '../../services/dashboardService';
import authReducer from '../../store/slices/authSlice';
import DashboardPage from './DashboardPage';

vi.mock('../../services/dashboardService', () => ({
  dashboardService: {
    fetchDashboardData: vi.fn(),
  },
}));

vi.mock('../../services/recruiterService', () => ({
  recruiterService: {
    getStats: vi.fn(),
    getRecentApplications: vi.fn(),
    getOnboardingSignals: vi.fn(),
  },
}));

vi.mock('../../lib/dashboardOperationalAnalytics', () => ({
  recordDashboardOperationalAnalytics: vi.fn(),
}));

const liveDashboardData: DashboardData = {
  stats: {
    xp: 120,
    level: 2,
    applications: 1,
    messages: 0,
  },
  jobs: [
    {
      id: 'job-design-systems',
      title: 'Design Systems Engineer',
      companyName: 'Northstar Labs',
      location: 'Remote',
      matchScore: 91,
    },
  ],
  challenges: [
    {
      id: 'challenge-refactor',
      title: 'Frontend Refactor Sprint',
      difficulty: 'Hard',
      participantCount: 12,
    },
  ],
  onboarding: {
    hasProfileDetails: true,
    skillCount: 3,
    applicationCount: 1,
    savedSearchCount: 0,
    enrollmentCount: 0,
    challengeSubmissionCount: 0,
  },
  meta: {
    source: 'live',
    fetchedAt: '2026-06-28T10:00:00.000Z',
    issues: [],
  },
};

const partialDashboardData: DashboardData = {
  ...liveDashboardData,
  stats: {
    ...liveDashboardData.stats,
    xp: 0,
    level: 1,
  },
  meta: {
    source: 'partial',
    fetchedAt: '2026-06-28T10:05:00.000Z',
    issues: [
      'XP and level did not refresh: PostgREST relation failed with service_role_token=secret.',
    ],
  },
};

const renderDashboardPage = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'dashboard-user',
          email: 'dashboard-user@example.com',
          full_name: 'Dashboard User',
          roles: ['ROLE_USER'],
        },
        session: null,
        loading: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <ToastProvider>
          <DashboardPage />
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

describe('DashboardPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows section-level partial refresh copy without exposing raw provider errors', async () => {
    vi.mocked(dashboardService.fetchDashboardData).mockResolvedValue(partialDashboardData);

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('Some dashboard sections could not refresh.')).toBeTruthy();
    });

    expect(screen.getByText('XP and level')).toBeTruthy();
    expect(screen.getByText('XP and level did not refresh.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry XP and level' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/PostgREST relation failed/i)).toBeNull();
    expectDecorativeSvgIcons(document.body);

    const requestCountBeforeRetry = vi.mocked(dashboardService.fetchDashboardData).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry XP and level' }));

    await waitFor(() => {
      expect(dashboardService.fetchDashboardData).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('recovers from a top-level load failure through the existing retry action', async () => {
    vi.mocked(dashboardService.fetchDashboardData)
      .mockRejectedValueOnce(new Error('dashboard service failed with service_role_token=secret'))
      .mockResolvedValue(liveDashboardData);

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('Dashboard data could not refresh.')).toBeTruthy();
    });

    expect(screen.getByText('Dashboard data did not refresh.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry affected' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();

    const requestCountBeforeRetry = vi.mocked(dashboardService.fetchDashboardData).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry affected' }));

    await waitFor(() => {
      expect(dashboardService.fetchDashboardData).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.getByText('Dashboard data refreshed.')).toBeTruthy();
    });
    expect(screen.getByText('Design Systems Engineer')).toBeTruthy();
    expect(screen.queryByText('Dashboard data did not refresh.')).toBeNull();
    expectDecorativeSvgIcons(document.body);
  });

  it('exposes dashboard summary groups with list semantics', async () => {
    vi.mocked(dashboardService.fetchDashboardData).mockResolvedValue(liveDashboardData);

    renderDashboardPage();

    await waitFor(() => {
      expect(screen.getByText('Dashboard data refreshed.')).toBeTruthy();
    });

    const metrics = screen.getByRole('list', { name: 'Talent summary metrics' });
    expect(within(metrics).getByRole('listitem', {
      name: 'Applications summary: 1. View applications',
    })).toBeTruthy();
    expect(within(metrics).getByRole('listitem', {
      name: 'XP Earned summary: 120. Earn more XP',
    })).toBeTruthy();

    const checklist = screen.getByRole('list', { name: 'Activation checklist tasks' });
    expect(within(checklist).getByRole('listitem', {
      name: 'Build your profile. Completed. Update profile',
    })).toBeTruthy();
    expect(within(checklist).getByRole('listitem', {
      name: 'Start a course. Not completed. Browse learning',
    })).toBeTruthy();

    const quickActions = screen.getByRole('list', { name: 'Quick Actions actions' });
    expect(within(quickActions).getByRole('listitem', { name: 'Continue learning' })).toBeTruthy();

    const opportunities = screen.getByRole('list', { name: 'Recent opportunities' });
    expect(within(opportunities).getByRole('listitem', {
      name: 'Recent opportunity Design Systems Engineer at Northstar Labs, Remote, 91% match',
    })).toBeTruthy();

    const challengeSummaries = screen.getByRole('list', { name: 'Active challenge summaries' });
    expect(within(challengeSummaries).getByRole('listitem', {
      name: 'Active challenge Frontend Refactor Sprint, 12 participants, Hard difficulty',
    })).toBeTruthy();
    expectDecorativeSvgIcons(document.body);
  });
});
