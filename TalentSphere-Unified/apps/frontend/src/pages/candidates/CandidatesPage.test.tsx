import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import { recruiterService, type Application } from '../../services/recruiterService';
import authReducer from '../../store/slices/authSlice';
import CandidatesPage from './CandidatesPage';

vi.mock('../../services/recruiterService', () => ({
  recruiterService: {
    getApplicationsPage: vi.fn(),
    getCandidateNotes: vi.fn(),
    getCandidateScorecards: vi.fn(),
    saveCandidateNote: vi.fn(),
    saveCandidateScorecard: vi.fn(),
    updateApplicationStatus: vi.fn(),
  },
}));

vi.mock('../../lib/candidateWorkflowAnalytics', () => ({
  recordCandidateWorkflowAnalytics: vi.fn(),
}));

const candidateFixture: Application = {
  id: 'application-candidate-001',
  userId: 'candidate-user-001',
  jobId: 'job-design-lead',
  status: 'PENDING',
  appliedAt: '2026-06-28T08:00:00.000Z',
  updatedAt: '2026-06-28T08:00:00.000Z',
  user: {
    fullName: 'Ava Candidate',
    email: 'ava.candidate@example.com',
  },
  job: {
    title: 'Design Lead',
  },
  resumeUrl: 'https://resume.example/ava-candidate.pdf',
  coverLetter: 'Experienced design leader.',
};

type CandidateFixtureOverrides = Partial<Omit<Application, 'job' | 'user'>> & {
  job?: Partial<NonNullable<Application['job']>>;
  user?: Partial<NonNullable<Application['user']>>;
};

const buildCandidateFixture = (overrides: CandidateFixtureOverrides = {}): Application => ({
  ...candidateFixture,
  ...overrides,
  user: {
    fullName: overrides.user?.fullName ?? candidateFixture.user?.fullName ?? 'Ava Candidate',
    email: overrides.user?.email ?? candidateFixture.user?.email ?? 'ava.candidate@example.com',
  },
  job: {
    title: overrides.job?.title ?? candidateFixture.job?.title ?? 'Design Lead',
  },
});

let localStorageData: Record<string, string>;

const renderCandidatesPage = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'recruiter-user',
          email: 'recruiter@example.com',
          roles: ['ROLE_RECRUITER'],
        },
        session: null,
        loading: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <ToastProvider>
        <CandidatesPage />
      </ToastProvider>
    </Provider>,
  );

  return store;
};

describe('CandidatesPage', () => {
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
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(recruiterService.getCandidateNotes).mockResolvedValue({});
    vi.mocked(recruiterService.getCandidateScorecards).mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('shows safe candidate load failure copy without exposing raw provider errors', async () => {
    vi.mocked(recruiterService.getApplicationsPage).mockRejectedValue(
      new Error('PostgREST candidate pipeline failed with service_role_token=secret'),
    );

    renderCandidatesPage();

    await waitFor(() => {
      expect(screen.getByText('Candidates could not load')).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Candidates' })).toBeTruthy();
    expect(screen.getByText('Candidates could not load')).toBeTruthy();
    expect(screen.getByText(/candidate applications did not respond/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry candidates' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/PostgREST candidate pipeline failed/i)).toBeNull();
  });

  it('retries the existing candidate list workflow from the safe failure state', async () => {
    vi.mocked(recruiterService.getApplicationsPage)
      .mockRejectedValueOnce(new Error('Candidate provider timeout with service_role_token=secret'))
      .mockResolvedValue({
        applications: [candidateFixture],
        total: 1,
        limit: 10,
        offset: 0,
        hasNext: false,
        nextCursor: null,
      });

    renderCandidatesPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry candidates' })).toBeTruthy();
    });

    const requestCountBeforeRetry = vi.mocked(recruiterService.getApplicationsPage).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry candidates' }));

    await waitFor(() => {
      expect(recruiterService.getApplicationsPage).toHaveBeenCalledTimes(requestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ava Candidate' })).toBeTruthy();
    });
    expect(screen.queryByText('Candidates could not load')).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe single-status failure copy and retries through the existing confirmation', async () => {
    vi.mocked(recruiterService.getApplicationsPage).mockResolvedValue({
      applications: [candidateFixture],
      total: 1,
      limit: 10,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    });
    vi.mocked(recruiterService.updateApplicationStatus)
      .mockRejectedValueOnce(new Error('Application status provider unavailable with service_role_token=secret'))
      .mockResolvedValueOnce({
        ...candidateFixture,
        status: 'REJECTED',
        updatedAt: '2026-06-28T09:00:00.000Z',
      });

    renderCandidatesPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ava Candidate' })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Rejection' }));

    await waitFor(() => {
      expect(screen.getByText(/application status could not be updated/i)).toBeTruthy();
    });
    expect(screen.getByText(/try again from this confirmation/i)).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Application status provider unavailable/i)).toBeNull();

    const statusRequestCountBeforeRetry = vi.mocked(recruiterService.updateApplicationStatus).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Rejection' }));

    await waitFor(() => {
      expect(recruiterService.updateApplicationStatus).toHaveBeenCalledTimes(statusRequestCountBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Confirm Rejection' })).toBeNull();
    });
  });

  it('shows safe all-failed bulk status copy and retries through the existing bulk confirmation', async () => {
    const secondCandidate = buildCandidateFixture({
      id: 'application-candidate-002',
      userId: 'candidate-user-002',
      user: {
        fullName: 'Ben Candidate',
        email: 'ben.candidate@example.com',
      },
      appliedAt: '2026-06-28T07:00:00.000Z',
      updatedAt: '2026-06-28T07:00:00.000Z',
    });

    vi.mocked(recruiterService.getApplicationsPage).mockResolvedValue({
      applications: [candidateFixture, secondCandidate],
      total: 2,
      limit: 10,
      offset: 0,
      hasNext: false,
      nextCursor: null,
    });
    vi.mocked(recruiterService.updateApplicationStatus)
      .mockRejectedValueOnce(new Error('Bulk status provider failed with service_role_token=secret'))
      .mockRejectedValueOnce(new Error('Bulk status provider failed with service_role_token=secret'))
      .mockResolvedValueOnce({
        ...candidateFixture,
        status: 'INTERVIEW',
        updatedAt: '2026-06-28T09:00:00.000Z',
      })
      .mockResolvedValueOnce({
        ...secondCandidate,
        status: 'INTERVIEW',
        updatedAt: '2026-06-28T09:00:00.000Z',
      });

    renderCandidatesPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ava Candidate' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Ben Candidate' })).toBeTruthy();
    });
    fireEvent.click(screen.getByLabelText('Select visible'));
    fireEvent.click(screen.getByRole('button', { name: 'Review Interview Move' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Interview Moves (2)' }));

    await waitFor(() => {
      expect(screen.getByText(/no selected applications were moved to interview/i)).toBeTruthy();
    });
    expect(screen.getByText(/try again from this confirmation/i)).toBeTruthy();
    expect(screen.queryByText(/Successful updates were saved/i)).toBeNull();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Bulk status provider failed/i)).toBeNull();

    const bulkRequestCountBeforeRetry = vi.mocked(recruiterService.updateApplicationStatus).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Interview Moves (2)' }));

    await waitFor(() => {
      expect(recruiterService.updateApplicationStatus).toHaveBeenCalledTimes(bulkRequestCountBeforeRetry + 2);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Review Bulk Interview Move' })).toBeNull();
    });
  });
});
