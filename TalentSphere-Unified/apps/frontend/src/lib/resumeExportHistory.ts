export type ResumeExportStatus = 'ready' | 'blocked';
export type ResumeExportMethod = 'browser-print' | 'html-download' | 'native-pdf' | 'provider-pdf';
export type ResumeExportPersistedTo = 'server' | 'local';

export interface ResumeExportRecord {
  id: string;
  userId: string;
  createdAt: string;
  status: ResumeExportStatus;
  method: ResumeExportMethod;
  fileName: string;
  detail: string;
  persistedTo: ResumeExportPersistedTo;
}

export interface ResumeExportRecordInput {
  id?: string;
  userId: string;
  createdAt?: string;
  status: ResumeExportStatus;
  method: ResumeExportMethod;
  fileName: string;
  detail: string;
  persistedTo?: ResumeExportPersistedTo;
}

type RawResumeExportRecord = Omit<ResumeExportRecord, 'persistedTo'> & {
  persistedTo?: unknown;
};

const defaultMaxExportHistory = 5;

const compact = (value?: string | null) => (value || '').trim();

const createExportRecordId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  const randomHex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${randomHex()}${randomHex()}-${randomHex()}-4${randomHex().slice(1)}-8${randomHex().slice(1)}-${randomHex()}${randomHex()}${randomHex()}`;
};

export const buildResumeExportRecord = ({
  id,
  userId,
  createdAt,
  status,
  method,
  fileName,
  detail,
  persistedTo = 'local',
}: ResumeExportRecordInput): ResumeExportRecord => ({
  id: id || createExportRecordId(),
  userId: compact(userId),
  createdAt: createdAt || new Date().toISOString(),
  status,
  method,
  fileName: compact(fileName) || 'Resume export',
  detail: compact(detail) || 'Resume export activity recorded.',
  persistedTo,
});

export const sanitizeResumeExportHistory = (
  value: unknown,
  options: { userId?: string; maxItems?: number } = {}
): ResumeExportRecord[] => {
  if (!Array.isArray(value)) return [];

  const maxItems = options.maxItems ?? defaultMaxExportHistory;
  const seen = new Set<string>();

  return value
    .filter((item): item is RawResumeExportRecord => (
      item &&
      typeof item.id === 'string' &&
      typeof item.userId === 'string' &&
      typeof item.createdAt === 'string' &&
      (item.status === 'ready' || item.status === 'blocked') &&
      (
        item.method === 'browser-print'
        || item.method === 'html-download'
        || item.method === 'native-pdf'
        || item.method === 'provider-pdf'
      ) &&
      typeof item.fileName === 'string' &&
      typeof item.detail === 'string'
    ))
    .map((item): ResumeExportRecord => {
      const persistedTo: ResumeExportPersistedTo = item.persistedTo === 'server' ? 'server' : 'local';
      return {
        ...item,
        persistedTo,
      };
    })
    .filter(item => !options.userId || item.userId === options.userId)
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxItems);
};

export const mergeResumeExportHistories = (
  primary: ResumeExportRecord[],
  fallback: ResumeExportRecord[],
  maxItems = defaultMaxExportHistory
) => sanitizeResumeExportHistory([...primary, ...fallback], { maxItems });
