import { describe, expect, it } from 'vitest';
import {
  getHiddenExploreJobsStorageKey,
  hideExploreJobPreference,
  mergeHiddenExploreJobs,
  restoreHiddenExploreJobPreference,
  sanitizeHiddenExploreJobs,
} from './hiddenExploreJobs';

describe('hiddenExploreJobs', () => {
  it('builds account-scoped and guest storage keys', () => {
    expect(getHiddenExploreJobsStorageKey('user-1')).toBe('talentsphere.hiddenExploreJobs.user-1');
    expect(getHiddenExploreJobsStorageKey()).toBe('talentsphere.hiddenExploreJobs.guest');
  });

  it('sanitizes malformed values, trims labels, deduplicates, and caps results', () => {
    expect(sanitizeHiddenExploreJobs([
      null,
      { jobId: '', title: 'Missing ID', hiddenAt: '2026-06-26T00:00:00Z' },
      { jobId: 'job-1', title: ' Frontend Engineer ', companyName: ' Acme ', jobType: ' FULL_TIME ', location: ' Remote ', hiddenAt: ' 2026-06-26T00:00:00Z ' },
      { jobId: 'job-1', title: 'Duplicate', hiddenAt: '2026-06-27T00:00:00Z' },
      { jobId: 'job-2', title: 'Backend Engineer', hiddenAt: '2026-06-26T01:00:00Z' },
    ], 1)).toEqual([
      {
        jobId: 'job-1',
        title: 'Frontend Engineer',
        companyName: 'Acme',
        jobType: 'FULL_TIME',
        location: 'Remote',
        hiddenAt: '2026-06-26T00:00:00Z',
      },
    ]);
  });

  it('hides a job at the top of the preference list without duplicating it', () => {
    const hiddenJobs = hideExploreJobPreference([
      {
        jobId: 'job-1',
        title: 'Frontend Engineer',
        hiddenAt: '2026-06-25T00:00:00Z',
      },
    ], {
      id: 'job-1',
      title: 'Senior Frontend Engineer',
      companyName: 'Acme Labs',
      jobType: 'CONTRACT',
      location: 'New York',
    }, '2026-06-26T00:00:00Z');

    expect(hiddenJobs).toEqual([
      {
        jobId: 'job-1',
        title: 'Senior Frontend Engineer',
        companyName: 'Acme Labs',
        jobType: 'CONTRACT',
        location: 'New York',
        hiddenAt: '2026-06-26T00:00:00Z',
      },
    ]);
  });

  it('restores a hidden job by removing only that job ID', () => {
    const hiddenJobs = restoreHiddenExploreJobPreference([
      {
        jobId: 'job-1',
        title: 'Frontend Engineer',
        hiddenAt: '2026-06-26T00:00:00Z',
      },
      {
        jobId: 'job-2',
        title: 'Backend Engineer',
        hiddenAt: '2026-06-26T01:00:00Z',
      },
    ], 'job-1');

    expect(hiddenJobs).toEqual([
      {
        jobId: 'job-2',
        title: 'Backend Engineer',
        hiddenAt: '2026-06-26T01:00:00Z',
      },
    ]);
  });

  it('merges local and account preferences by recency without duplicates', () => {
    const hiddenJobs = mergeHiddenExploreJobs([
      {
        jobId: 'job-1',
        title: 'Frontend Engineer',
        hiddenAt: '2026-06-26T00:00:00Z',
      },
      {
        jobId: 'job-2',
        title: 'Backend Engineer',
        hiddenAt: '2026-06-26T01:00:00Z',
      },
    ], [
      {
        jobId: 'job-1',
        title: 'Senior Frontend Engineer',
        companyName: 'Acme Labs',
        hiddenAt: '2026-06-26T02:00:00Z',
      },
    ]);

    expect(hiddenJobs).toEqual([
      {
        jobId: 'job-1',
        title: 'Senior Frontend Engineer',
        companyName: 'Acme Labs',
        hiddenAt: '2026-06-26T02:00:00Z',
      },
      {
        jobId: 'job-2',
        title: 'Backend Engineer',
        hiddenAt: '2026-06-26T01:00:00Z',
      },
    ]);
  });
});
