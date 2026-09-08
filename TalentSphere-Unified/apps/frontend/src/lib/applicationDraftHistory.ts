import type { ApplicationDraftSource } from '../services/applicationService';
import { appendHistory, compact, createHistoryId, mergeHistories, sanitizeHistory } from './historyManager';

export type ApplicationDraftHistoryReason = 'autosave' | 'profile_applied' | 'ai_applied' | 'restored' | 'cleared';

export interface ApplicationDraftHistoryEntry {
  id: string;
  userId: string;
  jobId: string;
  resumeUrl: string;
  coverLetter: string;
  source: ApplicationDraftSource;
  reason: ApplicationDraftHistoryReason;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDraftHistoryInput {
  id?: string;
  userId: string;
  jobId: string;
  resumeUrl: string;
  coverLetter: string;
  source: ApplicationDraftSource;
  reason?: ApplicationDraftHistoryReason;
  createdAt?: string;
  updatedAt?: string;
}

const defaultMaxHistoryItems = 5;
const defaultAutosaveCoalesceMs = 60_000;

export const hasApplicationDraftContent = (draft: Pick<ApplicationDraftHistoryInput, 'resumeUrl' | 'coverLetter'>) => (
  Boolean(compact(draft.resumeUrl) || compact(draft.coverLetter))
);

export const buildApplicationDraftHistoryEntry = ({
  id,
  userId,
  jobId,
  resumeUrl,
  coverLetter,
  source,
  reason = 'autosave',
  createdAt,
  updatedAt,
}: ApplicationDraftHistoryInput): ApplicationDraftHistoryEntry => {
  const now = updatedAt || createdAt || new Date().toISOString();

  return {
    id: id || createHistoryId(),
    userId: compact(userId),
    jobId: compact(jobId),
    resumeUrl,
    coverLetter,
    source: source === 'profile' || source === 'ai' ? source : 'manual',
    reason,
    createdAt: createdAt || now,
    updatedAt: now,
  };
};

export const isSameApplicationDraftSnapshot = (
  first: Pick<ApplicationDraftHistoryEntry, 'resumeUrl' | 'coverLetter' | 'source'>,
  second: Pick<ApplicationDraftHistoryEntry, 'resumeUrl' | 'coverLetter' | 'source'>
) => (
  first.resumeUrl === second.resumeUrl &&
  first.coverLetter === second.coverLetter &&
  first.source === second.source
);

const isApplicationDraftHistoryEntry = (item: unknown): item is ApplicationDraftHistoryEntry => (
  Boolean(
    item &&
    typeof (item as ApplicationDraftHistoryEntry).id === 'string' &&
    typeof (item as ApplicationDraftHistoryEntry).userId === 'string' &&
    typeof (item as ApplicationDraftHistoryEntry).jobId === 'string' &&
    typeof (item as ApplicationDraftHistoryEntry).resumeUrl === 'string' &&
    typeof (item as ApplicationDraftHistoryEntry).coverLetter === 'string' &&
    typeof (item as ApplicationDraftHistoryEntry).createdAt === 'string' &&
    typeof (item as ApplicationDraftHistoryEntry).updatedAt === 'string' &&
    ((item as ApplicationDraftHistoryEntry).source === 'manual'
      || (item as ApplicationDraftHistoryEntry).source === 'profile'
      || (item as ApplicationDraftHistoryEntry).source === 'ai')
  )
);

const createSanitizeOptions = (options: { userId?: string; jobId?: string; maxItems?: number } = {}) => ({
  isItem: isApplicationDraftHistoryEntry,
  filters: [
    (item: ApplicationDraftHistoryEntry) => !options.userId || item.userId === options.userId,
    (item: ApplicationDraftHistoryEntry) => !options.jobId || item.jobId === options.jobId,
  ],
  maxItems: options.maxItems ?? defaultMaxHistoryItems,
});

export const sanitizeApplicationDraftHistory = (
  value: unknown,
  options: { userId?: string; jobId?: string; maxItems?: number } = {}
): ApplicationDraftHistoryEntry[] => sanitizeHistory(value, createSanitizeOptions(options));

export const appendApplicationDraftHistory = (
  history: ApplicationDraftHistoryEntry[],
  input: ApplicationDraftHistoryInput,
  options: { maxItems?: number; autosaveCoalesceMs?: number } = {}
) => {
  if (!hasApplicationDraftContent(input)) {
    return sanitizeApplicationDraftHistory(history, {
      userId: input.userId,
      jobId: input.jobId,
      maxItems: options.maxItems,
    });
  }

  return appendHistory(history, buildApplicationDraftHistoryEntry(input), {
    ...createSanitizeOptions({ maxItems: options.maxItems }),
    autosaveCoalesceMs: options.autosaveCoalesceMs ?? defaultAutosaveCoalesceMs,
    isSameSnapshot: isSameApplicationDraftSnapshot,
    coalesce: (latest, next) => ({
      ...latest,
      resumeUrl: next.resumeUrl,
      coverLetter: next.coverLetter,
      source: next.source,
      updatedAt: next.updatedAt,
    }),
  });
};

export const mergeApplicationDraftHistories = (
  primary: ApplicationDraftHistoryEntry[],
  fallback: ApplicationDraftHistoryEntry[],
  maxItems = defaultMaxHistoryItems
) => mergeHistories(primary, fallback, createSanitizeOptions({ maxItems }));
