import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import { jobService } from '../../services/jobService';
import { applicationService } from '../../services/applicationService';
import authReducer from '../../store/slices/authSlice';
import type { Job } from '../../types/job';
import JobDetailPage from './JobDetailPage';

vi.mock('../../services/jobService', () => ({
  jobService: {
    getJobById: vi.fn(),
  },
}));

vi.mock('../../services/applicationService', () => ({
  applicationService: {
    getUserApplications: vi.fn(),
    submitApplication: vi.fn(),
  },
}));

const jobFixture: Job = {
  id: 'job-detail-unit',
  title: 'Frontend Platform Lead',
  description: 'Own the frontend platform for hiring workflows.',
  companyId: 'company-unit',
  companyName: 'Northstar Labs',
  location: 'Remote',
  jobType: 'FULL_TIME',
  salaryMin: 150000,
  salaryMax: 210000,
  requirements: ['React', 'TypeScript', 'Performance'],
  postedAt: '2026-06-28T09:00:00.000Z',
  status: 'PUBLISHED',
  matchScore: 82,
};

const renderJobDetail = (entry = '/jobs/job-detail-unit') => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 'learner-user-001',
          email: 'learner@example.com',
          full_name: 'Learner User',
          roles: ['ROLE_USER'],
        },
        session: null,
        loading: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <ToastProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/jobs/:id" element={<JobDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </Provider>,
  );
};

describe('JobDetailPage', () => {
  beforeEach(() => {
    vi.mocked(jobService.getJobById).mockResolvedValue(jobFixture);
    vi.mocked(applicationService.getUserApplications).mockResolvedValue([]);
    vi.mocked(applicationService.submitApplication).mockResolvedValue({
      id: 'application-unit',
      jobId: jobFixture.id,
      userId: 'learner-user-001',
      status: 'PENDING',
      appliedAt: '2026-06-28T09:00:00.000Z',
      resumeUrl: '',
      coverLetter: '',
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the job title, company, location, and salary', async () => {
    renderJobDetail();

    expect(await screen.findByRole('heading', { name: 'Frontend Platform Lead' })).toBeInTheDocument();
    expect(screen.getByText('Northstar Labs')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('$150,000 - $210,000')).toBeInTheDocument();
    expect(screen.getByText('Full-time')).toBeInTheDocument();
  });

  it('renders the description and requirements list', async () => {
    renderJobDetail();

    expect(await screen.findByText('Own the frontend platform for hiring workflows.')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Match score 82%')).toBeInTheDocument();
  });

  it('submits an application with the entered resume URL and cover letter', async () => {
    renderJobDetail();
    await screen.findByRole('heading', { name: 'Frontend Platform Lead' });

    fireEvent.change(screen.getByLabelText('Resume or profile URL'), {
      target: { value: 'https://resume.example/cv.pdf' },
    });
    fireEvent.change(screen.getByLabelText('Cover letter'), {
      target: { value: 'I would love to join Northstar Labs.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Application' }));

    await waitFor(() => {
      expect(applicationService.submitApplication).toHaveBeenCalledWith({
        userId: 'learner-user-001',
        jobId: jobFixture.id,
        resumeUrl: 'https://resume.example/cv.pdf',
        coverLetter: 'I would love to join Northstar Labs.',
      });
    });

    expect((await screen.findAllByText('Application submitted')).length).toBeGreaterThan(0);
  });

  it('shows the existing application status when the user already applied', async () => {
    vi.mocked(applicationService.getUserApplications).mockResolvedValue([
      {
        id: 'existing-app',
        jobId: jobFixture.id,
        userId: 'learner-user-001',
        status: 'INTERVIEW',
        appliedAt: '2026-06-28T09:00:00.000Z',
      },
    ]);

    renderJobDetail();

    expect(await screen.findByText('Application submitted')).toBeInTheDocument();
    expect(screen.getByText(/already applied for this role/i)).toBeInTheDocument();
    expect(screen.getByText(/interview/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit Application' })).not.toBeInTheDocument();
  });

  it('renders the not-found state when the job cannot be located', async () => {
    vi.mocked(jobService.getJobById).mockResolvedValue(null);

    renderJobDetail();

    expect(await screen.findByRole('heading', { name: 'Job not found' })).toBeInTheDocument();
    expect(screen.getByText('No job found')).toBeInTheDocument();
    expect(applicationService.getUserApplications).not.toHaveBeenCalled();
  });

  it('renders the load-failure state and retries', async () => {
    vi.mocked(jobService.getJobById)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(jobFixture);

    renderJobDetail();

    expect(await screen.findByText('Could not load this role')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry job' }));

    expect(await screen.findByRole('heading', { name: 'Frontend Platform Lead' })).toBeInTheDocument();
    expect(jobService.getJobById).toHaveBeenCalledTimes(2);
  });
});
