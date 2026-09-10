import type { JobPostFormDraft } from './jobPostTemplates';
import { appendHistory, compact, createHistoryId, mergeHistories, sanitizeHistory } from './historyManager';

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

const defaultMaxHistoryItems = 5;
const defaultAutosaveCoalesceMs = 60_000;

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

const isJobPostDraftHistoryEntry = (value: unknown): value is JobPostDraftHistoryEntry => (
  Boolean(
    value &&
    typeof (value as JobPostDraftHistoryEntry).id === 'string' &&
    typeof (value as JobPostDraftHistoryEntry).recruiterId === 'string' &&
    typeof (value as JobPostDraftHistoryEntry).draftKey === 'string' &&
    typeof (value as JobPostDraftHistoryEntry).title === 'string' &&
    typeof (value as JobPostDraftHistoryEntry).description === 'string' &&
    typeof (value as JobPostDraftHistoryEntry).location === 'string' &&
    typeof (value as JobPostDraftHistoryEntry).salaryMin === 'string' &&
    typeof (value as JobPostDraftHistoryEntry).salaryMax === 'string' &&
    typeof (value as JobPostDraftHistoryEntry).requirements === 'string' &&
    typeof (value as JobPostDraftHistoryEntry).jobType === 'string' &&
    typeof (value as JobPostDraftHistoryEntry).companyAttached === 'boolean' &&
    typeof (value as JobPostDraftHistoryEntry).createdAt === 'string' &&
    typeof (value as JobPostDraftHistoryEntry).updatedAt === 'string' &&
    (
      (value as JobPostDraftHistoryEntry).reason === 'autosave'
      || (value as JobPostDraftHistoryEntry).reason === 'template_applied'
      || (value as JobPostDraftHistoryEntry).reason === 'reviewed'
      || (value as JobPostDraftHistoryEntry).reason === 'saved'
      || (value as JobPostDraftHistoryEntry).reason === 'restored'
    )
  )
);

const normalizeJobPostDraftEntry = (item: JobPostDraftHistoryEntry): JobPostDraftHistoryEntry => ({
  ...item,
  jobId: compact(item.jobId) || null,
  companyId: compact(item.companyId) || null,
  companyName: compact(item.companyName),
  salaryRange: compact(item.salaryRange),
  category: compact(item.category),
  persistedTo: item.persistedTo === 'server' ? 'server' : 'local',
});

const createSanitizeOptions = (options: { recruiterId?: string; draftKey?: string; maxItems?: number } = {}) => ({
  isItem: isJobPostDraftHistoryEntry,
  normalize: normalizeJobPostDraftEntry,
  filters: [
    (item: JobPostDraftHistoryEntry) => !options.recruiterId || item.recruiterId === options.recruiterId,
    (item: JobPostDraftHistoryEntry) => !options.draftKey || item.draftKey === options.draftKey,
  ],
  maxItems: options.maxItems ?? defaultMaxHistoryItems,
});

export const sanitizeJobPostDraftHistory = (
  value: unknown,
  options: { recruiterId?: string; draftKey?: string; maxItems?: number } = {}
): JobPostDraftHistoryEntry[] => sanitizeHistory(value, createSanitizeOptions(options));

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

  const nextEntry = buildJobPostDraftHistoryEntry(input);
  return appendHistory(history, nextEntry, {
    ...createSanitizeOptions({ maxItems: options.maxItems }),
    autosaveCoalesceMs: options.autosaveCoalesceMs ?? defaultAutosaveCoalesceMs,
    isSameSnapshot: isSameJobPostDraftSnapshot,
    coalesce: (latest, next) => ({
      ...latest,
      title: next.title,
      description: next.description,
      location: next.location,
      salaryMin: next.salaryMin,
      salaryMax: next.salaryMax,
      requirements: next.requirements,
      jobType: next.jobType,
      salaryRange: next.salaryRange,
      category: next.category,
      companyId: next.companyId,
      companyName: next.companyName,
      companyAttached: next.companyAttached,
      updatedAt: next.updatedAt,
    }),
  });
};

export const mergeJobPostDraftHistories = (
  primary: JobPostDraftHistoryEntry[],
  fallback: JobPostDraftHistoryEntry[],
  maxItems = defaultMaxHistoryItems
) => mergeHistories(primary, fallback, createSanitizeOptions({ maxItems }));
