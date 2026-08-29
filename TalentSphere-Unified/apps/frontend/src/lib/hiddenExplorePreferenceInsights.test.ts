import { describe, expect, it } from 'vitest';
import {
  buildHiddenExplorePreferenceInsights,
  getHiddenExploreJobTypeLabel,
  normalizeHiddenExploreJobType,
} from './hiddenExplorePreferenceInsights';
import type { HiddenExploreJob } from './hiddenExploreJobs';

const hiddenJob = (
  jobId: string,
  jobType: string,
  hiddenAt: string
): HiddenExploreJob => ({
  jobId,
  title: `Role ${jobId}`,
  jobType,
  hiddenAt,
});

describe('hiddenExplorePreferenceInsights', () => {
  it('normalizes and labels job types', () => {
    expect(normalizeHiddenExploreJobType('full time')).toBe('FULL_TIME');
    expect(normalizeHiddenExploreJobType('part-time')).toBe('PART_TIME');
    expect(getHiddenExploreJobTypeLabel('CONTRACT')).toBe('Contract');
    expect(getHiddenExploreJobTypeLabel('seasonal')).toBe('seasonal');
  });

  it('builds a visible job-type insight after repeated hidden jobs', () => {
    const insights = buildHiddenExplorePreferenceInsights([
      hiddenJob('job-1', 'contract', '2026-06-26T10:00:00.000Z'),
      hiddenJob('job-2', 'CONTRACT', '2026-06-26T11:00:00.000Z'),
      hiddenJob('job-3', 'FULL_TIME', '2026-06-26T12:00:00.000Z'),
    ]);

    expect(insights).toEqual([
      {
        id: 'job_type:CONTRACT',
        kind: 'job_type',
        jobType: 'CONTRACT',
        label: 'Contract',
        title: 'Contract roles are often hidden',
        description: '2 hidden roles match this job type.',
        actionLabel: 'Hide Contract in this view',
        hiddenCount: 2,
      },
    ]);
  });

  it('does not suggest already applied view exclusions', () => {
    const insights = buildHiddenExplorePreferenceInsights([
      hiddenJob('job-1', 'contract', '2026-06-26T10:00:00.000Z'),
      hiddenJob('job-2', 'CONTRACT', '2026-06-26T11:00:00.000Z'),
      hiddenJob('job-3', 'INTERNSHIP', '2026-06-26T12:00:00.000Z'),
      hiddenJob('job-4', 'internship', '2026-06-26T13:00:00.000Z'),
    ], {
      excludedJobTypes: ['contract'],
    });

    expect(insights.map(insight => insight.jobType)).toEqual(['INTERNSHIP']);
  });

  it('honors minimum counts and max insight limits', () => {
    const insights = buildHiddenExplorePreferenceInsights([
      hiddenJob('job-1', 'contract', '2026-06-26T10:00:00.000Z'),
      hiddenJob('job-2', 'contract', '2026-06-26T11:00:00.000Z'),
      hiddenJob('job-3', 'internship', '2026-06-26T12:00:00.000Z'),
      hiddenJob('job-4', 'internship', '2026-06-26T13:00:00.000Z'),
      hiddenJob('job-5', 'freelance', '2026-06-26T14:00:00.000Z'),
    ], {
      minHiddenCount: 1,
      maxInsights: 2,
    });

    expect(insights.map(insight => insight.jobType)).toEqual(['INTERNSHIP', 'CONTRACT']);
  });
});
