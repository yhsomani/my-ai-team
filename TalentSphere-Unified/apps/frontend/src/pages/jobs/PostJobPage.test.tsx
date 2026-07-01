import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import { companyService, type Company } from '../../services/companyService';
import { jobService } from '../../services/jobService';
import { recruiterService } from '../../services/recruiterService';
import authReducer from '../../store/slices/authSlice';
import type { JobPostTemplate } from '../../lib/jobPostTemplates';
import PostJobPage from './PostJobPage';

vi.mock('../../services/jobService', () => ({
  jobService: {
    getJobPostTemplates: vi.fn(),
    saveJobPostTemplate: vi.fn(),
    deleteJobPostTemplate: vi.fn(),
    getJobPostDraftHistory: vi.fn(),
    saveJobPostDraftHistoryEntry: vi.fn(),
    postJob: vi.fn(),
    updateJob: vi.fn(),
  },
}));

vi.mock('../../services/recruiterService', () => ({
  recruiterService: {
    getRecruiterJobs: vi.fn(),
  },
}));

vi.mock('../../services/companyService', () => ({
  companyService: {
    getCompanyByUser: vi.fn(),
    registerCompany: vi.fn(),
    updateCompany: vi.fn(),
  },
}));

vi.mock('../../lib/onboardingAnalytics', () => ({
  recordOnboardingAnalytics: vi.fn(),
}));

const companyFixture: Company = {
  id: 'company-unit',
  name: 'Northstar Labs',
  description: 'Builds hiring tools.',
  website: 'https://northstar.example',
  location: 'Remote',
  industry: 'Software',
  employeeCount: 120,
  ownerUserId: 'post-job-recruiter',
  verified: false,
  createdAt: '2026-06-28T09:00:00.000Z',
};

const draftJobFixture = {
  id: 'draft-unit',
  title: 'Backend Reliability Lead',
  description: 'Keep production hiring systems reliable.',
  companyId: 'company-unit',
  companyName: 'Northstar Labs',
  location: 'Remote',
  jobType: 'FULL_TIME',
  salaryMin: 145000,
  salaryMax: 190000,
  requirements: ['SRE', 'TypeScript'],
  status: 'DRAFT',
};

const templateFixture: JobPostTemplate = {
  id: 'template-unit',
  name: 'Backend Reliability Template',
  recruiterId: 'post-job-recruiter',
  persistedTo: 'server',
  title: 'Backend Reliability Lead',
  description: 'Keep production hiring systems reliable.',
  location: 'Remote',
  salaryMin: '145000',
  salaryMax: '190000',
  requirements: 'SRE\nTypeScript',
  jobType: 'FULL_TIME',
  salaryRange: '',
  category: '',
  createdAt: '2026-06-28T09:00:00.000Z',
  updatedAt: '2026-06-28T09:00:00.000Z',
};

const draftHistoryFixture = {
  id: 'history-unit',
  recruiterId: 'post-job-recruiter',
  draftKey: 'new',
  jobId: null,
  companyId: 'company-unit',
  companyName: 'Northstar Labs',
  companyAttached: true,
  title: 'Saved Platform Draft',
  description: 'A saved draft for the frontend platform role.',
  location: 'Remote',
  jobType: 'FULL_TIME',
  salaryMin: '',
  salaryMax: '',
  salaryRange: '',
  category: '',
  requirements: 'React\nTypeScript',
  reason: 'saved' as const,
  persistedTo: 'server' as const,
  createdAt: '2026-06-28T09:00:00.000Z',
  updatedAt: '2026-06-28T09:00:00.000Z',
};

let localStorageData: Record<string, string>;

const renderPostJobPage = (initialEntry = '/jobs/post?draftId=draft-unit') => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'post-job-recruiter',
          email: 'recruiter@example.com',
          full_name: 'Post Job Recruiter',
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
        <MemoryRouter initialEntries={[initialEntry]}>
          <PostJobPage />
        </MemoryRouter>
      </ToastProvider>
    </Provider>,
  );
};

const fillRequiredJobDraftFields = () => {
  fireEvent.change(screen.getByLabelText('Job Title'), {
    target: { value: 'Frontend Platform Lead' },
  });
  fireEvent.change(screen.getByLabelText('Job Description'), {
    target: { value: 'Own the frontend platform for hiring workflows.' },
  });
  fireEvent.change(screen.getByLabelText('Location', { exact: true }), {
    target: { value: 'Remote' },
  });
  fireEvent.change(screen.getByLabelText('Requirements (One per line)'), {
    target: { value: 'React\nTypeScript' },
  });
};

const failLocalStorageWritesFor = (keyPart: string, message: string) => {
  vi.mocked(window.localStorage.setItem).mockImplementation((key: string, value: string) => {
    if (key.includes(keyPart)) {
      throw new Error(message);
    }
    localStorageData[key] = value;
  });
};

const expectDecorativeSvgIcons = (container: Element) => {
  const icons = Array.from(container.querySelectorAll('svg'));
  expect(icons.length).toBeGreaterThan(0);
  icons.forEach((icon) => {
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('focusable')).toBe('false');
  });
};

describe('PostJobPage', () => {
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

    vi.mocked(jobService.getJobPostTemplates).mockResolvedValue([]);
    vi.mocked(jobService.saveJobPostTemplate).mockImplementation(async (_recruiterId, template) => ({
      ...template,
      persistedTo: 'server',
    }));
    vi.mocked(jobService.deleteJobPostTemplate).mockResolvedValue(undefined);
    vi.mocked(jobService.getJobPostDraftHistory).mockResolvedValue([]);
    vi.mocked(jobService.saveJobPostDraftHistoryEntry).mockImplementation(async entry => entry);
    vi.mocked(companyService.getCompanyByUser).mockResolvedValue(companyFixture);
    vi.mocked(recruiterService.getRecruiterJobs).mockResolvedValue([draftJobFixture] as any);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('shows safe edit-draft context failure copy without exposing raw provider errors', async () => {
    vi.mocked(recruiterService.getRecruiterJobs).mockRejectedValue(
      new Error('PostgREST recruiter jobs failed with service_role_token=secret'),
    );

    renderPostJobPage();

    await waitFor(() => {
      expect(screen.getByText('Saved draft context could not load')).toBeTruthy();
    });

    expect(screen.getByRole('heading', { name: 'Edit Job Draft' })).toBeTruthy();
    expect(screen.getByText(/draft context did not respond/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry draft context' })).toBeTruthy();
    expect(screen.getByLabelText('Job Title')).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/PostgREST recruiter jobs failed/i)).toBeNull();
  });

  it('retries the existing recruiter jobs load workflow from the safe edit-draft failure state', async () => {
    vi.mocked(recruiterService.getRecruiterJobs)
      .mockRejectedValueOnce(new Error('PostgREST recruiter jobs failed with service_role_token=secret'))
      .mockResolvedValue([draftJobFixture] as any);

    renderPostJobPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry draft context' })).toBeTruthy();
    });

    const loadRequestsBeforeRetry = vi.mocked(recruiterService.getRecruiterJobs).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry draft context' }));

    await waitFor(() => {
      expect(recruiterService.getRecruiterJobs).toHaveBeenCalledTimes(loadRequestsBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Saved draft context could not load')).toBeNull();
    });

    expect(screen.getByDisplayValue('Backend Reliability Lead')).toBeTruthy();
    expect(screen.getByText('Editing saved draft. Save Changes updates this draft instead of creating a duplicate.')).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe company context load failure copy without exposing raw provider errors', async () => {
    vi.mocked(companyService.getCompanyByUser).mockRejectedValue(
      new Error('Company lookup failed with service_role_token=secret'),
    );

    renderPostJobPage('/jobs/post');

    await waitFor(() => {
      expect(screen.getByText('Company context could not load')).toBeTruthy();
    });

    expect(screen.getAllByText('Company profile lookup did not respond. Retry company context to reload company readiness before saving or publishing.').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Retry company context' })).toBeTruthy();
    expect(screen.getByLabelText('Company Name')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create & Attach Company' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Company lookup failed/i)).toBeNull();
  });

  it('retries the existing company context lookup workflow from the safe failure state', async () => {
    vi.mocked(companyService.getCompanyByUser)
      .mockRejectedValueOnce(new Error('Company lookup failed with service_role_token=secret'))
      .mockResolvedValueOnce(companyFixture);

    renderPostJobPage('/jobs/post');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry company context' })).toBeTruthy();
    });

    const lookupRequestsBeforeRetry = vi.mocked(companyService.getCompanyByUser).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry company context' }));

    await waitFor(() => {
      expect(companyService.getCompanyByUser).toHaveBeenCalledTimes(lookupRequestsBeforeRetry + 1);
    });
    await waitFor(() => {
      expect(screen.queryByText('Company context could not load')).toBeNull();
    });

    expect(screen.getByText('Northstar Labs will be attached to this draft.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save Company Profile' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('exposes Post Job edit and review sections with semantic structure', async () => {
    vi.mocked(jobService.getJobPostDraftHistory).mockResolvedValue([draftHistoryFixture]);

    renderPostJobPage('/jobs/post');

    const form = await screen.findByRole('form', { name: 'Post job draft workflow' });
    expect(screen.getByRole('region', { name: 'Post job workspace' })).toBeTruthy();
    expect(within(form).getByRole('region', { name: 'Job template controls' })).toBeTruthy();
    expect(within(form).getByRole('group', { name: 'Job template actions' })).toBeTruthy();
    expect(within(form).getByRole('region', { name: 'Company context' })).toBeTruthy();
    expect(within(form).getByRole('region', { name: 'Company profile details' })).toBeTruthy();
    expect(within(form).getByRole('region', { name: 'Job draft fields' })).toBeTruthy();
    expect(within(form).getByRole('group', { name: 'Post job draft actions' })).toBeTruthy();

    const draftHistory = await screen.findByRole('region', { name: 'Recent draft versions' });
    const draftHistoryList = within(draftHistory).getByRole('list', { name: 'Draft version history' });
    expect(within(draftHistoryList).getByRole('listitem', {
      name: 'Saved Platform Draft. Saved. Remote. Account synced',
    })).toBeTruthy();
    expectDecorativeSvgIcons(document.body);

    fillRequiredJobDraftFields();
    fireEvent.click(screen.getByRole('button', { name: 'Review Draft' }));

    const review = await screen.findByRole('region', { name: 'Job draft review' });
    const reviewMetadata = within(review).getByRole('list', { name: 'Job draft review metadata' });
    expect(within(reviewMetadata).getByRole('listitem', {
      name: 'Salary range: Not specified',
    })).toBeTruthy();
    expect(within(reviewMetadata).getByRole('listitem', {
      name: 'Requirements: 2 listed',
    })).toBeTruthy();
    expect(within(reviewMetadata).getByRole('listitem', {
      name: 'Company: Northstar Labs',
    })).toBeTruthy();
    expect(within(review).getByRole('region', { name: 'Job draft review description' })).toBeTruthy();

    const requirements = within(review).getByRole('list', { name: 'Job draft requirement preview' });
    expect(within(requirements).getByRole('listitem', { name: 'Requirement: React' })).toBeTruthy();
    expect(within(requirements).getByRole('listitem', { name: 'Requirement: TypeScript' })).toBeTruthy();
    expectDecorativeSvgIcons(review);
  });

  it('shows safe company creation failure copy and retries Create & Attach Company', async () => {
    vi.mocked(companyService.getCompanyByUser).mockResolvedValue(null as any);
    vi.mocked(companyService.registerCompany)
      .mockRejectedValueOnce(new Error('Company insert failed with service_role_token=secret'))
      .mockResolvedValueOnce(companyFixture);

    renderPostJobPage('/jobs/post');

    await waitFor(() => {
      expect(screen.getByText(/No company profile is attached/i)).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Company Name'), {
      target: { value: 'Northstar Labs' },
    });
    fireEvent.change(screen.getByLabelText('Industry'), {
      target: { value: 'Software' },
    });
    fireEvent.change(screen.getByLabelText('Company Location'), {
      target: { value: 'Remote' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create & Attach Company' }));

    await waitFor(() => {
      expect(companyService.registerCompany).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Company profile could not be created. Review the details and try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create & Attach Company' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Company insert failed/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Create & Attach Company' }));

    await waitFor(() => {
      expect(companyService.registerCompany).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getAllByText('Northstar Labs created and attached. Review remains required before saving.').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe company profile update failure copy and retries Save Company Profile', async () => {
    vi.mocked(companyService.updateCompany)
      .mockRejectedValueOnce(new Error('Company update failed with service_role_token=secret'))
      .mockResolvedValueOnce({
        ...companyFixture,
        industry: 'Platform software',
      });

    renderPostJobPage('/jobs/post');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Company Profile' })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Industry'), {
      target: { value: 'Platform software' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Company Profile' }));

    await waitFor(() => {
      expect(companyService.updateCompany).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Company profile details could not be saved. Review the fields and try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save Company Profile' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Company update failed/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save Company Profile' }));

    await waitFor(() => {
      expect(companyService.updateCompany).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByText('Northstar Labs profile is 100% complete.')).toBeTruthy();
    });
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
  });

  it('shows safe new draft save failure copy and retries Save Draft', async () => {
    vi.mocked(jobService.postJob)
      .mockRejectedValueOnce(new Error('Job draft insert failed with service_role_token=secret'))
      .mockResolvedValueOnce({
        ...draftJobFixture,
        id: 'new-draft-unit',
        title: 'Frontend Platform Lead',
      } as any);

    renderPostJobPage('/jobs/post');

    fillRequiredJobDraftFields();
    fireEvent.click(screen.getByRole('button', { name: 'Review Draft' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Draft' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

    await waitFor(() => {
      expect(jobService.postJob).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Draft could not be saved. Review the draft and try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Job draft insert failed/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

    await waitFor(() => {
      expect(jobService.postJob).toHaveBeenCalledTimes(2);
    });
  });

  it('shows safe draft update failure copy and retries Save Changes', async () => {
    vi.mocked(jobService.updateJob)
      .mockRejectedValueOnce(new Error('Job draft update failed with service_role_token=secret'))
      .mockResolvedValueOnce({
        ...draftJobFixture,
        title: 'Backend Reliability Lead',
      } as any);

    renderPostJobPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Backend Reliability Lead')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Review Changes' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(jobService.updateJob).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Draft changes could not be saved. Review the draft and try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/Job draft update failed/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(jobService.updateJob).toHaveBeenCalledTimes(2);
    });
  });

  it('shows accurate template persistence failure copy when browser storage and account sync fail', async () => {
    failLocalStorageWritesFor('jobPostTemplates', 'QuotaExceededError template storage service_role_token=secret');
    vi.mocked(jobService.saveJobPostTemplate).mockRejectedValue(
      new Error('Template upsert failed with service_role_token=secret'),
    );

    renderPostJobPage('/jobs/post');

    fillRequiredJobDraftFields();
    fireEvent.click(screen.getByRole('button', { name: 'Save Current' }));

    await waitFor(() => {
      expect(jobService.saveJobPostTemplate).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getByText('Template could not sync to your account or browser storage. Current form fields are unchanged.')).toBeTruthy();
    });

    expect((screen.getByLabelText('Job Title') as HTMLInputElement).value).toBe('Frontend Platform Lead');
    expect(screen.getByRole('button', { name: 'Save Current' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/QuotaExceededError/i)).toBeNull();
    expect(screen.queryByText(/Template upsert failed/i)).toBeNull();
  });

  it('shows safe template delete storage failure copy and keeps the current form unchanged', async () => {
    vi.mocked(jobService.getJobPostTemplates).mockResolvedValue([templateFixture]);

    renderPostJobPage('/jobs/post');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Backend Reliability Template (synced)' })).toBeTruthy();
    });

    fillRequiredJobDraftFields();
    fireEvent.change(screen.getByLabelText('Job templates'), {
      target: { value: templateFixture.id },
    });
    failLocalStorageWritesFor('jobPostTemplates', 'QuotaExceededError delete storage service_role_token=secret');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.getByText('Delete Job Template')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Template' }));

    await waitFor(() => {
      expect(jobService.deleteJobPostTemplate).toHaveBeenCalledWith('post-job-recruiter', templateFixture.id);
    });
    await waitFor(() => {
      expect(screen.getByText('Template deleted from your account. Browser storage is unavailable.')).toBeTruthy();
    });

    expect((screen.getByLabelText('Job Title') as HTMLInputElement).value).toBe('Frontend Platform Lead');
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/QuotaExceededError/i)).toBeNull();
  });

  it('shows accurate template delete failure copy when browser storage and account sync both fail', async () => {
    vi.mocked(jobService.getJobPostTemplates).mockResolvedValue([templateFixture]);
    vi.mocked(jobService.deleteJobPostTemplate).mockRejectedValue(
      new Error('Template delete failed with service_role_token=secret'),
    );

    renderPostJobPage('/jobs/post');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Backend Reliability Template (synced)' })).toBeTruthy();
    });

    fillRequiredJobDraftFields();
    fireEvent.change(screen.getByLabelText('Job templates'), {
      target: { value: templateFixture.id },
    });
    failLocalStorageWritesFor('jobPostTemplates', 'QuotaExceededError delete storage service_role_token=secret');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Template' }));

    await waitFor(() => {
      expect(jobService.deleteJobPostTemplate).toHaveBeenCalledWith('post-job-recruiter', templateFixture.id);
    });
    await waitFor(() => {
      expect(screen.getByText('Template delete could not sync to your account or browser storage. Refreshing may restore it.')).toBeTruthy();
    });

    expect((screen.getByLabelText('Job Title') as HTMLInputElement).value).toBe('Frontend Platform Lead');
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/QuotaExceededError/i)).toBeNull();
    expect(screen.queryByText(/Template delete failed/i)).toBeNull();
  });

  it('shows accurate draft-history persistence failure copy when browser storage and account sync fail', async () => {
    failLocalStorageWritesFor('jobPostDraftHistory', 'QuotaExceededError draft history service_role_token=secret');
    vi.mocked(jobService.saveJobPostDraftHistoryEntry).mockRejectedValue(
      new Error('Draft history upsert failed with service_role_token=secret'),
    );

    renderPostJobPage('/jobs/post');

    fillRequiredJobDraftFields();
    fireEvent.click(screen.getByRole('button', { name: 'Review Draft' }));

    await waitFor(() => {
      expect(jobService.saveJobPostDraftHistoryEntry).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('Draft history could not sync to your account or browser storage. Current form fields are unchanged.')).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeTruthy();
    expect(screen.queryByText(/service_role_token/i)).toBeNull();
    expect(screen.queryByText(/QuotaExceededError/i)).toBeNull();
    expect(screen.queryByText(/Draft history upsert failed/i)).toBeNull();
  });
});
