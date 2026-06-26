import type { ApplicationDraftSource } from '../services/applicationService';

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

const compact = (value?: string | null) => (value || '').trim();

const createHistoryId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  const randomHex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${randomHex()}${randomHex()}-${randomHex()}-4${randomHex().slice(1)}-8${randomHex().slice(1)}-${randomHex()}${randomHex()}${randomHex()}`;
};

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

export const sanitizeApplicationDraftHistory = (
  value: unknown,
  options: { userId?: string; jobId?: string; maxItems?: number } = {}
): ApplicationDraftHistoryEntry[] => {
  if (!Array.isArray(value)) return [];

  const maxItems = options.maxItems ?? defaultMaxHistoryItems;
  const seen = new Set<string>();

  return value
    .filter((item): item is ApplicationDraftHistoryEntry => (
      item &&
      typeof item.id === 'string' &&
      typeof item.userId === 'string' &&
      typeof item.jobId === 'string' &&
      typeof item.resumeUrl === 'string' &&
      typeof item.coverLetter === 'string' &&
      typeof item.createdAt === 'string' &&
      typeof item.updatedAt === 'string' &&
      (item.source === 'manual' || item.source === 'profile' || item.source === 'ai')
    ))
    .filter(item => !options.userId || item.userId === options.userId)
    .filter(item => !options.jobId || item.jobId === options.jobId)
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, maxItems);
};

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

  const maxItems = options.maxItems ?? defaultMaxHistoryItems;
  const autosaveCoalesceMs = options.autosaveCoalesceMs ?? defaultAutosaveCoalesceMs;
  const nextEntry = buildApplicationDraftHistoryEntry(input);
  const current = sanitizeApplicationDraftHistory(history, {
    userId: nextEntry.userId,
    jobId: nextEntry.jobId,
    maxItems,
  });
  const [latest, ...rest] = current;

  if (latest && isSameApplicationDraftSnapshot(latest, nextEntry)) {
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
        resumeUrl: nextEntry.resumeUrl,
        coverLetter: nextEntry.coverLetter,
        source: nextEntry.source,
        updatedAt: nextEntry.updatedAt,
      },
      ...rest,
    ].slice(0, maxItems);
  }

  return [nextEntry, ...current].slice(0, maxItems);
};

export const mergeApplicationDraftHistories = (
  primary: ApplicationDraftHistoryEntry[],
  fallback: ApplicationDraftHistoryEntry[],
  maxItems = defaultMaxHistoryItems
) => sanitizeApplicationDraftHistory([...primary, ...fallback], { maxItems });
