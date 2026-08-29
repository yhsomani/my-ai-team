import type { JobPostFormDraft } from './jobPostTemplates';

export type JobPostDraftHistoryReason = 'autosave' | 'template_applied' | 'reviewed' | 'saved' | 'restored';
export type JobPostDraftHistoryPersistedTo = 'server' | 'local';

export interface JobPostDraftHistoryEntry extends JobPostFormDraft {
  id: string;
  recruiterId: string;
  draftKey: string;
  jobId?: string | null;
  companyId?: string | null;
  companyName?: string;
  companyAttached: boolean;
  reason: JobPostDraftHistoryReason;
  persistedTo: JobPostDraftHistoryPersistedTo;
  createdAt: string;
  updatedAt: string;
}

export interface JobPostDraftHistoryInput {
  id?: string;
  recruiterId: string;
  draftKey: string;
  jobId?: string | null;
  draft: JobPostFormDraft;
  companyId?: string | null;
  companyName?: string | null;
  companyAttached?: boolean;
  reason?: JobPostDraftHistoryReason;
  persistedTo?: JobPostDraftHistoryPersistedTo;
  createdAt?: string;
  updatedAt?: string;
}

type RawJobPostDraftHistoryEntry = Omit<JobPostDraftHistoryEntry, 'persistedTo'> & {
  persistedTo?: unknown;
};

const defaultMaxHistoryItems = 5;
const defaultAutosaveCoalesceMs = 60_000;

const compact = (value?: string | null) => (value || '').trim();

const createHistoryId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  const randomHex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${randomHex()}${randomHex()}-${randomHex()}-4${randomHex().slice(1)}-8${randomHex().slice(1)}-${randomHex()}${randomHex()}${randomHex()}`;
};

export const getJobPostDraftHistoryStorageKey = (recruiterId?: string) => (
  `talentsphere.jobPostDraftHistory.${recruiterId || 'guest'}`
);

export const hasJobPostDraftHistoryContent = (draft: JobPostFormDraft) => (
  Boolean(
    compact(draft.title) ||
    compact(draft.description) ||
    compact(draft.location) ||
    compact(draft.requirements)
  )
);

export const buildJobPostDraftHistoryEntry = ({
  id,
  recruiterId,
  draftKey,
  jobId,
  draft,
  companyId,
  companyName,
  companyAttached = false,
  reason = 'autosave',
  persistedTo = 'local',
  createdAt,
  updatedAt,
}: JobPostDraftHistoryInput): JobPostDraftHistoryEntry => {
  const now = updatedAt || createdAt || new Date().toISOString();

  return {
    id: id || createHistoryId(),
    recruiterId: compact(recruiterId),
    draftKey: compact(draftKey) || 'new',
    jobId: compact(jobId) || null,
    title: compact(draft.title),
    description: compact(draft.description),
    location: compact(draft.location),
    salaryMin: compact(draft.salaryMin),
    salaryMax: compact(draft.salaryMax),
    requirements: compact(draft.requirements),
    jobType: compact(draft.jobType) || 'FULL_TIME',
    salaryRange: compact(draft.salaryRange),
    category: compact(draft.category),
    companyId: companyAttached ? compact(companyId) || null : null,
    companyName: companyAttached ? compact(companyName) : '',
    companyAttached,
    reason,
    persistedTo,
    createdAt: createdAt || now,
    updatedAt: now,
  };
};

export const toJobPostDraftFromHistoryEntry = (entry: JobPostDraftHistoryEntry): JobPostFormDraft => ({
  title: entry.title,
  description: entry.description,
  location: entry.location,
  salaryMin: entry.salaryMin,
  salaryMax: entry.salaryMax,
  requirements: entry.requirements,
  jobType: entry.jobType,
  salaryRange: entry.salaryRange || '',
  category: entry.category || '',
});

export const isSameJobPostDraftSnapshot = (
  first: Pick<JobPostDraftHistoryEntry, 'title' | 'description' | 'location' | 'salaryMin' | 'salaryMax' | 'requirements' | 'jobType' | 'companyId' | 'companyName' | 'companyAttached'>,
  second: Pick<JobPostDraftHistoryEntry, 'title' | 'description' | 'location' | 'salaryMin' | 'salaryMax' | 'requirements' | 'jobType' | 'companyId' | 'companyName' | 'companyAttached'>
) => (
  first.title === second.title &&
  first.description === second.description &&
  first.location === second.location &&
  first.salaryMin === second.salaryMin &&
  first.salaryMax === second.salaryMax &&
  first.requirements === second.requirements &&
  first.jobType === second.jobType &&
  first.companyId === second.companyId &&
  first.companyName === second.companyName &&
  first.companyAttached === second.companyAttached
);

export const sanitizeJobPostDraftHistory = (
  value: unknown,
  options: { recruiterId?: string; draftKey?: string; maxItems?: number } = {}
): JobPostDraftHistoryEntry[] => {
  if (!Array.isArray(value)) return [];

  const maxItems = options.maxItems ?? defaultMaxHistoryItems;
  const seen = new Set<string>();

  return value
    .filter((item): item is RawJobPostDraftHistoryEntry => (
      item &&
      typeof item.id === 'string' &&
      typeof item.recruiterId === 'string' &&
      typeof item.draftKey === 'string' &&
      typeof item.title === 'string' &&
      typeof item.description === 'string' &&
      typeof item.location === 'string' &&
      typeof item.salaryMin === 'string' &&
      typeof item.salaryMax === 'string' &&
      typeof item.requirements === 'string' &&
      typeof item.jobType === 'string' &&
      typeof item.companyAttached === 'boolean' &&
      typeof item.createdAt === 'string' &&
      typeof item.updatedAt === 'string' &&
      (
        item.reason === 'autosave' ||
        item.reason === 'template_applied' ||
        item.reason === 'reviewed' ||
        item.reason === 'saved' ||
        item.reason === 'restored'
      )
    ))
    .map((item): JobPostDraftHistoryEntry => {
      const persistedTo: JobPostDraftHistoryPersistedTo = item.persistedTo === 'server' ? 'server' : 'local';
      return {
        ...item,
        jobId: compact(item.jobId) || null,
        companyId: compact(item.companyId) || null,
        companyName: compact(item.companyName),
        salaryRange: compact(item.salaryRange),
        category: compact(item.category),
        persistedTo,
      };
    })
    .filter(item => !options.recruiterId || item.recruiterId === options.recruiterId)
    .filter(item => !options.draftKey || item.draftKey === options.draftKey)
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, maxItems);
};

export const appendJobPostDraftHistory = (
  history: JobPostDraftHistoryEntry[],
  input: JobPostDraftHistoryInput,
  options: { maxItems?: number; autosaveCoalesceMs?: number } = {}
) => {
  if (!hasJobPostDraftHistoryContent(input.draft)) {
    return sanitizeJobPostDraftHistory(history, {
      recruiterId: input.recruiterId,
      draftKey: input.draftKey,
      maxItems: options.maxItems,
    });
  }

  const maxItems = options.maxItems ?? defaultMaxHistoryItems;
  const autosaveCoalesceMs = options.autosaveCoalesceMs ?? defaultAutosaveCoalesceMs;
  const nextEntry = buildJobPostDraftHistoryEntry(input);
  const current = sanitizeJobPostDraftHistory(history, {
    recruiterId: nextEntry.recruiterId,
    draftKey: nextEntry.draftKey,
    maxItems,
  });
  const [latest, ...rest] = current;

  if (latest && isSameJobPostDraftSnapshot(latest, nextEntry)) {
    return current;
  }

  if (
    latest &&
    latest.reason === 'autosave' &&
    nextEntry.reason === 'autosave' &&
    new Date(nextEntry.updatedAt).getTime() - new Date(latest.createdAt).getTime() < autosaveCoalesceMs
  ) {
    return [
      {
        ...latest,
        title: nextEntry.title,
        description: nextEntry.description,
        location: nextEntry.location,
        salaryMin: nextEntry.salaryMin,
        salaryMax: nextEntry.salaryMax,
        requirements: nextEntry.requirements,
        jobType: nextEntry.jobType,
        salaryRange: nextEntry.salaryRange,
        category: nextEntry.category,
        companyId: nextEntry.companyId,
        companyName: nextEntry.companyName,
        companyAttached: nextEntry.companyAttached,
        updatedAt: nextEntry.updatedAt,
      },
      ...rest,
    ].slice(0, maxItems);
  }

  return [nextEntry, ...current].slice(0, maxItems);
};

export const mergeJobPostDraftHistories = (
  primary: JobPostDraftHistoryEntry[],
  fallback: JobPostDraftHistoryEntry[],
  maxItems = defaultMaxHistoryItems
) => sanitizeJobPostDraftHistory([...primary, ...fallback], { maxItems });
