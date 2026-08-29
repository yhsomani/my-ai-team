import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import { applicationService } from '../../services/applicationService';
import { getJobPublishPolicyErrorMessage, jobService } from '../../services/jobService';
import { profileService } from '../../services/profileService';
import { recruiterService } from '../../services/recruiterService';
import { settingsService } from '../../services/settingsService';
import { useGetJobsPageQuery, useGetJobsQuery } from '../../store/slices/jobSlice';
import authReducer from '../../store/slices/authSlice';
import type { ApplicationStatusEvent, Job, JobApplication } from '../../types/job';
import JobsPage from './JobsPage';

vi.mock('../../store/slices/jobSlice', () => ({
  useGetJobsPageQuery: vi.fn(),
  useGetJobsQuery: vi.fn(),
}));

vi.mock('../../services/applicationService', () => ({
  applicationService: {
    getUserApplications: vi.fn(),
    getApplicationStatusEvents: vi.fn(),
    submitApplication: vi.fn(),
    applyToJob: vi.fn(),
    getApplicationDraft: vi.fn(),
    saveApplicationDraft: vi.fn(),
    deleteApplicationDraft: vi.fn(),
    getApplicationDraftHistory: vi.fn(),
    saveApplicationDraftHistoryEntry: vi.fn(),
  },
}));

vi.mock('../../services/jobService', () => ({
  getJobPublishPolicyErrorMessage: vi.fn(() => null),
  jobService: {
    getHiddenExploreJobs: vi.fn(),
    saveHiddenExploreJob: vi.fn(),
    deleteHiddenExploreJob: vi.fn(),
    clearHiddenExploreJobs: vi.fn(),
    getSavedSearches: vi.fn(),
    saveSavedSearch: vi.fn(),
    deleteSavedSearch: vi.fn(),
    createJob: vi.fn(),
    updateJob: vi.fn(),
  },
}));

vi.mock('../../services/profileService', () => ({
  profileService: {
    getProfile: vi.fn(),
  },
}));

vi.mock('../../services/recruiterService', () => ({
  recruiterService: {
    getRecruiterJobs: vi.fn(),
  },
}));

vi.mock('../../services/settingsService', () => ({
  settingsService: {
    getNotifications: vi.fn(),
  },
}));

vi.mock('../../services/notificationService', () => ({
  notificationService: {
    createLocalNotification: vi.fn(),
    createNotification: vi.fn(),
  },
}));

vi.mock('../../services/notificationDigestService', () => ({
  notificationDigestService: {
    queueSavedSearchDigestItem: vi.fn(),
  },
}));

vi.mock('../../lib/jobRecommendationPreferenceAnalytics', () => ({
  recordJobRecommendationPreferenceAnalytics: vi.fn(),
}));

vi.mock('../../lib/savedSearchAnalytics', () => ({
  recordSavedSearchAnalytics: vi.fn(),
}));

vi.mock('../../lib/applicationWorkflowAnalytics', () => ({
  recordApplicationWorkflowAnalytics: vi.fn(),
}));

vi.mock('../../lib/recruiterPublishAnalytics', () => ({
  recordRecruiterPublishAnalytics: vi.fn(),
}));

vi.mock('../../lib/aiWorkflowPrefillAudit', () => ({
  recordAiWorkflowPrefillDecision: vi.fn(),
}));

const jobFixture: Job = {
  id: 'job-explore-001',
  title: 'Frontend Platform Engineer',
  description: 'Build accessible hiring workflows.',
  companyId: 'company-northstar',
  companyName: 'Northstar Labs',
  location: 'Remote',
  jobType: 'FULL_TIME',
  salaryMin: 140000,
  salaryMax: 175000,
  requirements: ['React', 'TypeScript'],
  postedAt: '2026-06-28T09:00:00.000Z',
  status: 'PUBLISHED',
};

const applicationFixture: JobApplication = {
  id: 'application-001',
  jobId: jobFixture.id,
  userId: 'jobs-user',
  status: 'PENDING',
  appliedAt: '2026-06-28T10:00:00.000Z',
  resumeUrl: 'https://example.com/resume.pdf',
  coverLetter: 'I can lead frontend platform accessibility work.',
  job: jobFixture,
};

const applicationStatusEventFixture: ApplicationStatusEvent = {
  id: 'application-status-001',
  applicationId: applicationFixture.id,
  previousStatus: 'PENDING',
  status: 'REVIEWED',
  reason: 'Recruiter reviewed profile',
  createdAt: '2026-06-28T11:00:00.000Z',
};

const recruiterPostingFixture: Record<string, any> = {
  id: 'posting-draft-001',
  title: 'Design Systems Lead',
  description: 'Lead reusable UI patterns for recruiter workflows.',
  companyId: 'company-northstar',
  companyName: 'Northstar Labs',
  location: 'Remote',
  jobType: 'FULL_TIME',
  salaryMin: 150000,
  salaryMax: 190000,
  requirements: ['React', 'Design systems'],
  postedAt: '2026-06-28T11:00:00.000Z',
  status: 'DRAFT',
};

let localStorageData: Record<string, string>;
let refetchJobsMock: ReturnType<typeof vi.fn>;
let jobsPageQueryResponse: Record<string, unknown>;

const renderJobsPage = (initialEntry = '/jobs', roles = ['ROLE_USER']) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'jobs-user',
          email: 'jobs-user@example.com',
          full_name: 'Jobs User',
          roles,
        },
        session: null,
        loading: false,
      },
    },
  });

  return render(
    <Provider store={store}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <JobsPage />
        </MemoryRouter>
      </ToastProvider>
    </Provider>,
  );
};

const expectDecorativeSvgIcons = (container: Element) => {
  const icons = Array.from(container.querySelectorAll('svg'));
  expect(icons.length).toBeGreaterThan(0);
  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('JobsPage', () => {
  beforeEach(() => {
    localStorageData = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageData[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageData[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageData[key];
        }),
        clear: vi.fn(() => {
          localStorageData = {};
        }),
      },
      configurable: true,
    });

    refetchJobsMock = vi.fn();
    jobsPageQueryResponse = {
      data: {
        jobs: [],
        total: 0,
        limit: 12,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchJobsMock,
    };

    vi.mocked(useGetJobsPageQuery).mockImplementation(() => jobsPageQueryResponse as any);
    vi.mocked(useGetJobsQuery).mockReturnValue({ data: [] } as any);
    vi.mocked(applicationService.getUserApplications).mockResolvedValue([]);
    vi.mocked(applicationService.getApplicationStatusEvents).mockResolvedValue([]);
    vi.mocked(applicationService.getApplicationDraft).mockResolvedValue(null);
    vi.mocked(applicationService.getApplicationDraftHistory).mockResolvedValue([]);
    vi.mocked(jobService.getHiddenExploreJobs).mockResolvedValue([]);
    vi.mocked(jobService.getSavedSearches).mockResolvedValue([]);
    vi.mocked(profileService.getProfile).mockResolvedValue(null as any);
    vi.mocked(recruiterService.getRecruiterJobs).mockResolvedValue([]);
    vi.mocked(settingsService.getNotifications).mockResolvedValue(null);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('shows safe job catalog load failure copy without exposing raw provider errors', async () => {
    jobsPageQueryResponse = {
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: 'PostgREST jobs query failed with service_role_token=secret',
      refetch: refetchJobsMock,
    };

    renderJobsPage();

    await waitFor(() => {
      expect(screen.getByText('Jobs could not load')).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Jobs' })).toBeTruthy();
    expect(screen.getByText(/job catalog did not respond/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry jobs' })).toBeTruthy();
    expect(screen.getByLabelText('Search jobs')).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/PostgREST jobs query failed/i)).toBeNull();
  });

  it('retries the existing jobs catalog workflow from the safe failure state', async () => {
    jobsPageQueryResponse = {
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: 'PostgREST jobs query failed with service_role_token=secret',
      refetch: refetchJobsMock,
    };

    const { rerender } = renderJobsPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry jobs' })).toBeTruthy();
    });

    const refetchCallsBeforeRetry = refetchJobsMock.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry jobs' }));
    expect(refetchJobsMock).toHaveBeenCalledTimes(refetchCallsBeforeRetry + 1);

    jobsPageQueryResponse = {
      data: {
        jobs: [jobFixture],
        total: 1,
        limit: 12,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchJobsMock,
    };

    rerender(
      <Provider store={configureStore({
        reducer: { auth: authReducer },
        preloadedState: {
          auth: {
            user: {
              id: 'jobs-user',
              email: 'jobs-user@example.com',
              full_name: 'Jobs User',
              roles: ['ROLE_USER'],
            },
            session: null,
            loading: false,
          },
        },
      })}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/jobs']}>
            <JobsPage />
          </MemoryRouter>
        </ToastProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Frontend Platform Engineer')).toBeTruthy();
    });
    expect(screen.queryByText('Jobs could not load')).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe application history load failure copy without exposing raw provider errors', async () => {
    vi.mocked(applicationService.getUserApplications).mockRejectedValue(
      new Error('Applications provider timeout with service_role_token=secret'),
    );

    renderJobsPage('/jobs?tab=applied');

    await waitFor(() => {
      expect(screen.getByText(/application history did not respond/i)).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Jobs' })).toBeTruthy();
    expect(screen.getAllByText('Applications unavailable').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Retry applications' })).toBeTruthy();
    expect(screen.getByLabelText('Search applications')).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Applications provider timeout/i)).toBeNull();
  });

  it('retries the existing application history workflow from the safe failure state', async () => {
    vi.mocked(applicationService.getUserApplications)
      .mockRejectedValueOnce(new Error('Applications provider timeout with service_role_token=secret'))
      .mockResolvedValueOnce([applicationFixture]);

    renderJobsPage('/jobs?tab=applied');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry applications' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry applications' }));

    await waitFor(() => {
      expect(screen.getByText('Frontend Platform Engineer')).toBeTruthy();
    });

    expect(applicationService.getUserApplications).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/application history did not respond/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry applications' })).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('exposes Explore, Applied, My Posts, and saved searches with semantic result structure', async () => {
    jobsPageQueryResponse = {
      data: {
        jobs: [jobFixture],
        total: 1,
        limit: 12,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchJobsMock,
    };
    vi.mocked(jobService.getSavedSearches).mockResolvedValue([
      {
        id: 'saved-search-001',
        userId: 'jobs-user',
        name: 'Remote frontend roles',
        searchTerm: 'Frontend',
        filters: {
          jobType: '',
          location: 'Remote',
          minSalary: '',
          maxSalary: '',
        },
        alertEnabled: true,
        lastMatchCount: 0,
        createdAt: '2026-06-28T10:00:00.000Z',
        updatedAt: '2026-06-28T10:00:00.000Z',
      },
    ] as any);

    renderJobsPage('/jobs', ['ROLE_USER', 'ROLE_RECRUITER']);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Explore job results' })).toBeTruthy();
    });

    const jobsSearch = screen.getByRole('search', { name: 'Jobs search' });
    expect(jobsSearch.getAttribute('data-ui')).toBe('jobs-search-surface');
    const searchInput = screen.getByLabelText('Search jobs');
    expect(jobsSearch.contains(searchInput)).toBe(true);
    expect(searchInput.getAttribute('aria-describedby')).toBe('jobs-search-help');
    expect(screen.getByText(/Search updates the active Jobs tab/i).id).toBe('jobs-search-help');
    const filterGroup = screen.getByRole('group', { name: 'Explore job filters' });
    expect(filterGroup.getAttribute('data-ui')).toBe('jobs-filter-group');
    expect(filterGroup.getAttribute('aria-describedby')).toBe('jobs-filter-help');
    expect(screen.getByText(/Filter Explore results by location/i).id).toBe('jobs-filter-help');

    const exploreJobCard = within(screen.getByRole('list', { name: 'Explore job results' })).getByRole('listitem', {
      name: 'Frontend Platform Engineer at Northstar Labs. Remote. Full-time. $140,000 - $175,000.',
    });
    expect(exploreJobCard).toBeTruthy();
    expect(within(exploreJobCard).getByText('Remote')).toBeTruthy();
    expect(within(exploreJobCard).getByText('Full-time')).toBeTruthy();
    expect(within(exploreJobCard).getByText('$140,000 - $175,000')).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'Saved searches' })).getByRole('listitem', {
      name: 'Remote frontend roles. New match tracking enabled.',
    })).toBeTruthy();
    expectDecorativeSvgIcons(document.body);

    cleanup();
    vi.mocked(applicationService.getUserApplications).mockResolvedValue([applicationFixture]);

    renderJobsPage('/jobs?tab=applied', ['ROLE_USER', 'ROLE_RECRUITER']);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Applied applications' })).toBeTruthy();
    });
    const appliedJobCard = within(screen.getByRole('list', { name: 'Applied applications' })).getByRole('listitem', {
      name: 'Application for Frontend Platform Engineer at Northstar Labs. Status: PENDING.',
    });
    expect(appliedJobCard).toBeTruthy();
    expect(within(appliedJobCard).getByText('Remote')).toBeTruthy();
    expect(within(appliedJobCard).getByText('Full-time')).toBeTruthy();
    expect(within(appliedJobCard).getByText('$140,000 - $175,000')).toBeTruthy();
    expectDecorativeSvgIcons(document.body);

    cleanup();
    vi.mocked(recruiterService.getRecruiterJobs).mockResolvedValue([recruiterPostingFixture] as any);

    renderJobsPage('/jobs?tab=postings', ['ROLE_USER', 'ROLE_RECRUITER']);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Recruiter postings' })).toBeTruthy();
    });
    const recruiterPostingCard = within(screen.getByRole('list', { name: 'Recruiter postings' })).getByRole('listitem', {
      name: 'Posting Design Systems Lead at Northstar Labs. Status: DRAFT. No publish checklist issues.',
    });
    expect(recruiterPostingCard).toBeTruthy();
    expect(within(recruiterPostingCard).getByText('Remote')).toBeTruthy();
    expect(within(recruiterPostingCard).getByText('Full-time')).toBeTruthy();
    expect(within(recruiterPostingCard).getByText('$150,000 - $190,000')).toBeTruthy();
    expectDecorativeSvgIcons(document.body);
  });

  it('exposes application status timeline events with semantic structure', async () => {
    vi.mocked(applicationService.getUserApplications).mockResolvedValue([applicationFixture]);
    vi.mocked(applicationService.getApplicationStatusEvents).mockResolvedValue([applicationStatusEventFixture]);

    renderJobsPage('/jobs?tab=applied', ['ROLE_USER', 'ROLE_RECRUITER']);

    await waitFor(() => {
      expect(screen.getByRole('list', { name: 'Applied applications' })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));

    const timeline = await screen.findByRole('region', {
      name: 'Application status timeline for Frontend Platform Engineer at Northstar Labs',
    });
    const statusEvents = within(timeline).getByRole('list', { name: 'Recorded application status events' });
    expect(within(statusEvents).getByRole('listitem', {
      name: /Status REVIEWED.*From PENDING to REVIEWED.*Recruiter reviewed profile/i,
    })).toBeTruthy();
    expectDecorativeSvgIcons(timeline);
  });

  it('shows safe recruiter postings load failure copy without exposing raw provider errors', async () => {
    vi.mocked(recruiterService.getRecruiterJobs).mockRejectedValue(
      new Error('Recruiter postings provider timeout with service_role_token=secret'),
    );

    renderJobsPage('/jobs?tab=postings', ['ROLE_USER', 'ROLE_RECRUITER']);

    await waitFor(() => {
      expect(screen.getByText(/recruiter postings did not respond/i)).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Jobs' })).toBeTruthy();
    expect(screen.getByText('Recruiter postings unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry postings' })).toBeTruthy();
    expect(screen.getByLabelText('Search my postings')).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Recruiter postings provider timeout/i)).toBeNull();
  });

  it('retries the existing recruiter postings workflow from the safe failure state', async () => {
    vi.mocked(recruiterService.getRecruiterJobs)
      .mockRejectedValueOnce(new Error('Recruiter postings provider timeout with service_role_token=secret'))
      .mockResolvedValueOnce([recruiterPostingFixture] as any);

    renderJobsPage('/jobs?tab=postings', ['ROLE_USER', 'ROLE_RECRUITER']);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry postings' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry postings' }));

    await waitFor(() => {
      expect(screen.getByText('Design Systems Lead')).toBeTruthy();
    });

    expect(recruiterService.getRecruiterJobs).toHaveBeenCalledTimes(2);
    expect(recruiterService.getRecruiterJobs).toHaveBeenLastCalledWith('jobs-user');
    expect(screen.queryByText(/recruiter postings did not respond/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry postings' })).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('keeps saved searches local when account sync fails without exposing raw provider errors', async () => {
    jobsPageQueryResponse = {
      data: {
        jobs: [jobFixture],
        total: 1,
        limit: 12,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchJobsMock,
    };
    vi.mocked(jobService.saveSavedSearch).mockRejectedValueOnce(
      new Error('Saved search upsert failed with service_role_token=secret'),
    );

    renderJobsPage();

    await waitFor(() => {
      expect(screen.getByText('Frontend Platform Engineer')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Search jobs'), { target: { value: 'Frontend' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Search' }));

    const saveDialog = await screen.findByRole('dialog', { name: 'Save Job Search' });
    fireEvent.change(within(saveDialog).getByLabelText('Search Name'), { target: { value: 'Remote frontend roles' } });
    fireEvent.click(within(saveDialog).getByRole('button', { name: 'Save Search' }));

    await waitFor(() => {
      expect(screen.getByText('Saved locally')).toBeTruthy();
    });

    expect(jobService.saveSavedSearch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Remote frontend roles' })).toBeTruthy();
    expect(screen.getByText('Server saved-search sync is unavailable.')).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Saved search upsert failed/i)).toBeNull();
  });

  it('keeps hidden Explore preferences local when account sync fails and explains all-hidden results', async () => {
    jobsPageQueryResponse = {
      data: {
        jobs: [jobFixture],
        total: 1,
        limit: 12,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchJobsMock,
    };
    vi.mocked(jobService.saveHiddenExploreJob).mockRejectedValueOnce(
      new Error('Hidden Explore preference upsert failed with service_role_token=secret'),
    );

    renderJobsPage();

    await waitFor(() => {
      expect(screen.getByText('Frontend Platform Engineer')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Hide Frontend Platform Engineer from Explore' }));

    await waitFor(() => {
      expect(screen.getByText('Hidden jobs saved locally')).toBeTruthy();
    });

    expect(jobService.saveHiddenExploreJob).toHaveBeenCalledTimes(1);
    expect(screen.getByText('1 hidden from Explore')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Restore Last' })).toBeTruthy();
    expect(screen.getByText('All jobs hidden in this view')).toBeTruthy();
    expect(screen.getByText(/hidden-job preferences are filtering every job/i)).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Hidden Explore preference upsert failed/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Restore Last' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Hide Frontend Platform Engineer from Explore' })).toBeTruthy();
    });
  });

  it('shows safe saved-search browser storage failure copy while keeping the saved search visible', async () => {
    jobsPageQueryResponse = {
      data: {
        jobs: [jobFixture],
        total: 1,
        limit: 12,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchJobsMock,
    };
    vi.mocked(jobService.saveSavedSearch).mockImplementation(async (_userId, savedSearch) => savedSearch as any);

    renderJobsPage();

    await waitFor(() => {
      expect(screen.getByText('Frontend Platform Engineer')).toBeTruthy();
      expect(jobService.getSavedSearches).toHaveBeenCalledTimes(1);
    });

    const setItemMock = vi.mocked(window.localStorage.setItem);
    setItemMock.mockClear();
    setItemMock.mockImplementation((key: string, value: string) => {
      if (key === 'talentsphere.savedJobSearches.jobs-user') {
        throw new Error('QuotaExceededError saved search service_role_token=secret');
      }
      localStorageData[key] = value;
    });

    fireEvent.change(screen.getByLabelText('Search jobs'), { target: { value: 'Frontend' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Search' }));

    const saveDialog = await screen.findByRole('dialog', { name: 'Save Job Search' });
    fireEvent.change(within(saveDialog).getByLabelText('Search Name'), { target: { value: 'Remote frontend roles' } });
    fireEvent.click(within(saveDialog).getByRole('button', { name: 'Save Search' }));

    await waitFor(() => {
      expect(screen.getByText('Saved search not stored')).toBeTruthy();
    });

    expect(screen.getByText('Your browser blocked local storage for this search.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remote frontend roles' })).toBeTruthy();
    expect(screen.queryByText(/QuotaExceededError/i)).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe hidden Explore browser storage failure copy while keeping restore controls available', async () => {
    jobsPageQueryResponse = {
      data: {
        jobs: [jobFixture],
        total: 1,
        limit: 12,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchJobsMock,
    };

    renderJobsPage();

    await waitFor(() => {
      expect(screen.getByText('Frontend Platform Engineer')).toBeTruthy();
      expect(jobService.getHiddenExploreJobs).toHaveBeenCalledTimes(1);
    });

    const setItemMock = vi.mocked(window.localStorage.setItem);
    setItemMock.mockClear();
    setItemMock.mockImplementation((key: string, value: string) => {
      if (key === 'talentsphere.hiddenExploreJobs.jobs-user') {
        throw new Error('QuotaExceededError hidden preference service_role_token=secret');
      }
      localStorageData[key] = value;
    });

    fireEvent.click(screen.getByRole('button', { name: 'Hide Frontend Platform Engineer from Explore' }));

    await waitFor(() => {
      expect(screen.getByText('Visibility preference not saved')).toBeTruthy();
    });

    expect(screen.getByText('Your visibility preference changed in this session, but your browser blocked local storage.')).toBeTruthy();
    expect(screen.getByText('1 hidden from Explore')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Restore Last' })).toBeTruthy();
    expect(screen.getByText('All jobs hidden in this view')).toBeTruthy();
    expect(screen.queryByText(/QuotaExceededError/i)).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Restore Last' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Hide Frontend Platform Engineer from Explore' })).toBeTruthy();
    });
  });

  it('shows safe application draft browser storage failure copy beside the editable draft', async () => {
    jobsPageQueryResponse = {
      data: {
        jobs: [jobFixture],
        total: 1,
        limit: 12,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchJobsMock,
    };

    renderJobsPage();

    await waitFor(() => {
      expect(screen.getByText('Frontend Platform Engineer')).toBeTruthy();
    });

    const setItemMock = vi.mocked(window.localStorage.setItem);
    setItemMock.mockClear();
    setItemMock.mockImplementation((key: string, value: string) => {
      if (key === 'talentsphere.applicationDrafts.jobs-user') {
        throw new Error('QuotaExceededError application draft service_role_token=secret');
      }
      localStorageData[key] = value;
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply Now' }));
    await screen.findByRole('dialog', { name: 'Review Application' });
    fireEvent.change(screen.getByLabelText('Resume or Profile URL'), {
      target: { value: 'https://example.com/profile' },
    });

    await waitFor(() => {
      expect(screen.getByText('Application draft changed in this session, but browser storage blocked saving it.')).toBeTruthy();
    });

    expect((screen.getByLabelText('Resume or Profile URL') as HTMLInputElement).value).toBe('https://example.com/profile');
    expect(screen.getByRole('button', { name: 'Submit Application' })).toBeTruthy();
    expect(screen.queryByText(/QuotaExceededError/i)).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe application draft-history browser storage failure copy beside the editable draft', async () => {
    jobsPageQueryResponse = {
      data: {
        jobs: [jobFixture],
        total: 1,
        limit: 12,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchJobsMock,
    };

    renderJobsPage();

    await waitFor(() => {
      expect(screen.getByText('Frontend Platform Engineer')).toBeTruthy();
    });

    const setItemMock = vi.mocked(window.localStorage.setItem);
    setItemMock.mockClear();
    setItemMock.mockImplementation((key: string, value: string) => {
      if (key === 'talentsphere.applicationDraftHistory.jobs-user') {
        throw new Error('QuotaExceededError application draft history service_role_token=secret');
      }
      localStorageData[key] = value;
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply Now' }));
    await screen.findByRole('dialog', { name: 'Review Application' });
    fireEvent.change(screen.getByLabelText('Cover Letter'), {
      target: { value: 'I can lead accessible frontend systems.' },
    });

    await waitFor(() => {
      expect(screen.getByText('Draft history changed in this session, but browser storage blocked saving it.')).toBeTruthy();
    });

    expect((screen.getByLabelText('Cover Letter') as HTMLTextAreaElement).value).toBe('I can lead accessible frontend systems.');
    expect(screen.getByRole('button', { name: 'Submit Application' })).toBeTruthy();
    expect(screen.queryByText(/QuotaExceededError/i)).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe application draft account-sync failure copy beside the editable draft', async () => {
    jobsPageQueryResponse = {
      data: {
        jobs: [jobFixture],
        total: 1,
        limit: 12,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchJobsMock,
    };
    vi.mocked(applicationService.saveApplicationDraft).mockRejectedValueOnce(
      new Error('Application draft upsert failed with service_role_token=secret'),
    );

    renderJobsPage();

    await waitFor(() => {
      expect(screen.getByText('Frontend Platform Engineer')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply Now' }));
    await screen.findByRole('dialog', { name: 'Review Application' });
    fireEvent.change(screen.getByLabelText('Resume or Profile URL'), {
      target: { value: 'https://example.com/profile' },
    });

    await waitFor(() => {
      expect(applicationService.saveApplicationDraft).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText('Application draft updated locally, but account sync is unavailable.')).toBeTruthy();
    });

    expect((screen.getByLabelText('Resume or Profile URL') as HTMLInputElement).value).toBe('https://example.com/profile');
    expect(screen.getByRole('button', { name: 'Submit Application' })).toBeTruthy();
    expect(screen.queryByText(/Application draft upsert failed/i)).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe application submit failure copy and retries through the existing review dialog', async () => {
    jobsPageQueryResponse = {
      data: {
        jobs: [jobFixture],
        total: 1,
        limit: 12,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: refetchJobsMock,
    };
    vi.mocked(applicationService.submitApplication)
      .mockRejectedValueOnce(new Error('PostgREST application insert failed with service_role_token=secret'))
      .mockResolvedValueOnce(applicationFixture);

    renderJobsPage();

    await waitFor(() => {
      expect(screen.getByText('Frontend Platform Engineer')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply Now' }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Review Application' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Application' }));

    await waitFor(() => {
      expect(screen.getByText(/The application was not submitted/i)).toBeTruthy();
    });
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/PostgREST application insert failed/i)).toBeNull();
    expect(applicationService.submitApplication).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Submit Application' }));

    await waitFor(() => {
      expect(applicationService.submitApplication).toHaveBeenCalledTimes(2);
      expect(screen.getByRole('dialog', { name: 'Application Details' })).toBeTruthy();
    });
    expect(screen.queryByText(/The application was not submitted/i)).toBeNull();
  });

  it('shows safe recruiter publish failure copy and retries through the existing checklist dialog', async () => {
    vi.mocked(recruiterService.getRecruiterJobs).mockResolvedValue([recruiterPostingFixture] as any);
    vi.mocked(getJobPublishPolicyErrorMessage).mockReturnValue(
      'This posting is missing required publish details. Open the draft, finish the checklist, and publish again.',
    );
    vi.mocked(jobService.updateJob)
      .mockRejectedValueOnce(new Error('Cannot publish job with service_role_token=secret'))
      .mockResolvedValueOnce({ ...recruiterPostingFixture, status: 'PUBLISHED' } as any);

    renderJobsPage('/jobs?tab=postings', ['ROLE_USER', 'ROLE_RECRUITER']);

    await waitFor(() => {
      expect(screen.getByText('Design Systems Lead')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Review Publish' }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Review Before Publishing' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Publish Job' }));

    await waitFor(() => {
      const publishAlert = within(screen.getByRole('dialog', { name: 'Review Before Publishing' })).getByRole('alert');
      expect(publishAlert.textContent).toMatch(/This posting is missing required publish details/i);
    });
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Cannot publish job with/i)).toBeNull();
    expect(jobService.updateJob).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Publish Job' }));

    await waitFor(() => {
      expect(jobService.updateJob).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('dialog', { name: 'Review Before Publishing' })).toBeNull();
    });
  });
});
