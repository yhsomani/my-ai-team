import type { HiddenExploreJob } from './hiddenExploreJobs';

export interface HiddenExplorePreferenceInsight {
  id: string;
  kind: 'job_type';
  jobType: string;
  label: string;
  title: string;
  description: string;
  actionLabel: string;
  hiddenCount: number;
}

interface HiddenExplorePreferenceInsightOptions {
  excludedJobTypes?: string[];
  minHiddenCount?: number;
  maxInsights?: number;
}

const defaultMinHiddenCount = 2;
const defaultMaxInsights = 2;

const jobTypeLabels: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  FREELANCE: 'Freelance',
  INTERNSHIP: 'Internship',
};

const compact = (value?: string | null) => (value || '').trim();

export const normalizeHiddenExploreJobType = (value?: string | null) => (
  compact(value).toUpperCase().replace(/[\s-]+/g, '_')
);

export const getHiddenExploreJobTypeLabel = (value?: string | null) => {
  const normalized = normalizeHiddenExploreJobType(value);
  return jobTypeLabels[normalized] || compact(value) || 'Job type';
};

const getHiddenAtTime = (hiddenJob: HiddenExploreJob) => {
  const time = new Date(hiddenJob.hiddenAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const buildHiddenExplorePreferenceInsights = (
  hiddenJobs: HiddenExploreJob[],
  {
    excludedJobTypes = [],
    minHiddenCount = defaultMinHiddenCount,
    maxInsights = defaultMaxInsights,
  }: HiddenExplorePreferenceInsightOptions = {}
): HiddenExplorePreferenceInsight[] => {
  const excludedTypes = new Set(excludedJobTypes.map(normalizeHiddenExploreJobType).filter(Boolean));
  const counts = hiddenJobs.reduce<Record<string, { count: number; latestHiddenAt: number }>>((acc, hiddenJob) => {
    const jobType = normalizeHiddenExploreJobType(hiddenJob.jobType);
    if (!jobType || excludedTypes.has(jobType)) return acc;

    const current = acc[jobType] || { count: 0, latestHiddenAt: 0 };
    acc[jobType] = {
      count: current.count + 1,
      latestHiddenAt: Math.max(current.latestHiddenAt, getHiddenAtTime(hiddenJob)),
    };

    return acc;
  }, {});

  return Object.entries(counts)
    .filter(([, value]) => value.count >= minHiddenCount)
    .sort(([, a], [, b]) => b.count - a.count || b.latestHiddenAt - a.latestHiddenAt)
    .slice(0, maxInsights)
    .map(([jobType, value]) => {
      const label = getHiddenExploreJobTypeLabel(jobType);

      return {
        id: `job_type:${jobType}`,
        kind: 'job_type',
        jobType,
        label,
        title: `${label} roles are often hidden`,
        description: `${value.count} hidden ${value.count === 1 ? 'role matches' : 'roles match'} this job type.`,
        actionLabel: `Hide ${label} in this view`,
        hiddenCount: value.count,
      };
    });
};
