import type { Job } from '../types/job';

export interface HiddenExploreJob {
  jobId: string;
  title: string;
  companyName?: string;
  jobType?: string;
  location?: string;
  hiddenAt: string;
}

const defaultMaxHiddenExploreJobs = 50;

const compact = (value?: string | null) => (value || '').trim();

const getHiddenAtTime = (hiddenJob: HiddenExploreJob) => {
  const time = new Date(hiddenJob.hiddenAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const getHiddenExploreJobsStorageKey = (userId?: string) => (
  `talentsphere.hiddenExploreJobs.${userId || 'guest'}`
);

export const sanitizeHiddenExploreJobs = (
  value: unknown,
  maxItems = defaultMaxHiddenExploreJobs
): HiddenExploreJob[] => {
  if (!Array.isArray(value)) return [];

  const seenJobIds = new Set<string>();

  return value.reduce<HiddenExploreJob[]>((acc, item) => {
    if (acc.length >= maxItems || !item || typeof item !== 'object') return acc;

    const candidate = item as Partial<HiddenExploreJob>;
    const jobId = compact(candidate.jobId);
    const title = compact(candidate.title);
    const hiddenAt = compact(candidate.hiddenAt);
    const companyName = compact(candidate.companyName);
    const jobType = compact(candidate.jobType);
    const location = compact(candidate.location);

    if (!jobId || !title || !hiddenAt || seenJobIds.has(jobId)) return acc;

    seenJobIds.add(jobId);
    acc.push({
      jobId,
      title,
      hiddenAt,
      ...(companyName ? { companyName } : {}),
      ...(jobType ? { jobType } : {}),
      ...(location ? { location } : {}),
    });

    return acc;
  }, []);
};

export const hideExploreJobPreference = (
  hiddenJobs: HiddenExploreJob[],
  job: Pick<Job, 'id' | 'title'> & Partial<Pick<Job, 'companyName' | 'jobType' | 'location'>>,
  hiddenAt = new Date().toISOString(),
  maxItems = defaultMaxHiddenExploreJobs
): HiddenExploreJob[] => {
  const jobId = compact(job.id);
  if (!jobId) return sanitizeHiddenExploreJobs(hiddenJobs, maxItems);

  const nextHiddenJob: HiddenExploreJob = {
    jobId,
    title: compact(job.title) || 'Untitled job',
    hiddenAt,
    ...(compact(job.companyName) ? { companyName: compact(job.companyName) } : {}),
    ...(compact(job.jobType) ? { jobType: compact(job.jobType) } : {}),
    ...(compact(job.location) ? { location: compact(job.location) } : {}),
  };

  return sanitizeHiddenExploreJobs([
    nextHiddenJob,
    ...hiddenJobs.filter(hiddenJob => hiddenJob.jobId !== jobId),
  ], maxItems);
};

export const restoreHiddenExploreJobPreference = (
  hiddenJobs: HiddenExploreJob[],
  jobId: string,
  maxItems = defaultMaxHiddenExploreJobs
): HiddenExploreJob[] => {
  const restoredJobId = compact(jobId);

  return sanitizeHiddenExploreJobs(hiddenJobs, maxItems).filter(hiddenJob => (
    hiddenJob.jobId !== restoredJobId
  ));
};

export const mergeHiddenExploreJobs = (
  hiddenJobs: HiddenExploreJob[],
  incomingHiddenJobs: HiddenExploreJob[],
  maxItems = defaultMaxHiddenExploreJobs
): HiddenExploreJob[] => sanitizeHiddenExploreJobs([
  ...hiddenJobs,
  ...incomingHiddenJobs,
].sort((a, b) => getHiddenAtTime(b) - getHiddenAtTime(a)), maxItems);
