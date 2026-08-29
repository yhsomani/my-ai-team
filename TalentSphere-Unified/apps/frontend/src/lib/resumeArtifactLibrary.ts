import { normalizeAttachmentUrl } from './messagingAttachments';

export type ResumeArtifactStatus = 'active' | 'deleted';
export type ResumeArtifactPersistedTo = 'server' | 'local';

export interface ResumeArtifactRecord {
  id: string;
  userId?: string;
  url: string;
  fileName: string;
  uploadedAt: string;
  deletedAt?: string;
  status: ResumeArtifactStatus;
  persistedTo: ResumeArtifactPersistedTo;
}

export interface ResumeArtifactTombstone {
  url: string;
  fileName?: string;
  deletedAt: string;
  persistedTo?: ResumeArtifactPersistedTo;
}

const defaultMaxResumeArtifacts = 5;

const sanitizeFileName = (value?: unknown) => {
  const fileName = typeof value === 'string'
    ? value.trim().replace(/[\r\n\t]+/g, ' ')
    : '';

  return (fileName || 'Resume PDF').slice(0, 160);
};

const sanitizeIsoDate = (value?: unknown) => {
  if (typeof value !== 'string') return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

export const createResumeArtifactId = (url: string) => {
  const normalizedUrl = normalizeAttachmentUrl(url);
  if (!normalizedUrl) return '';

  let hash = 0;
  for (let index = 0; index < normalizedUrl.length; index += 1) {
    hash = ((hash << 5) - hash + normalizedUrl.charCodeAt(index)) | 0;
  }

  return `resume-artifact-${Math.abs(hash).toString(36)}`;
};

export const buildResumeArtifactRecord = (input: unknown): ResumeArtifactRecord | null => {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as Partial<ResumeArtifactRecord> & {
    user_id?: unknown;
    file_name?: unknown;
    file_url?: unknown;
    uploaded_at?: unknown;
    deleted_at?: unknown;
    persisted_to?: unknown;
  };
  const url = normalizeAttachmentUrl(candidate.url || (typeof candidate.file_url === 'string' ? candidate.file_url : undefined));

  if (!url) return null;
  const status = candidate.status === 'deleted' ? 'deleted' : 'active';
  const deletedAtCandidate = candidate.deletedAt || candidate.deleted_at;

  return {
    id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : createResumeArtifactId(url),
    userId: typeof candidate.userId === 'string' ? candidate.userId : typeof candidate.user_id === 'string' ? candidate.user_id : undefined,
    url,
    fileName: sanitizeFileName(candidate.fileName || candidate.file_name),
    uploadedAt: sanitizeIsoDate(candidate.uploadedAt || candidate.uploaded_at),
    deletedAt: status === 'deleted' ? sanitizeIsoDate(deletedAtCandidate) : undefined,
    status,
    persistedTo: candidate.persistedTo === 'server' || candidate.persisted_to === 'server' ? 'server' : 'local',
  };
};

export const sanitizeResumeArtifactLibrary = (
  value: unknown,
  options: { maxItems?: number; includeDeleted?: boolean } = {}
): ResumeArtifactRecord[] => {
  if (!Array.isArray(value)) return [];
  const maxItems = options.maxItems ?? defaultMaxResumeArtifacts;
  const seenUrls = new Set<string>();
  const artifacts: ResumeArtifactRecord[] = [];

  for (const item of value) {
    const artifact = buildResumeArtifactRecord(item);
    if (!artifact || seenUrls.has(artifact.url)) continue;
    if (!options.includeDeleted && artifact.status === 'deleted') continue;
    seenUrls.add(artifact.url);
    artifacts.push(artifact);
  }

  return artifacts
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, maxItems);
};

export const addResumeArtifactRecord = (
  current: ResumeArtifactRecord[],
  artifact: ResumeArtifactRecord,
  options: { maxItems?: number } = {}
) => sanitizeResumeArtifactLibrary([{
  ...artifact,
  status: 'active',
}, ...current.filter(item => item.url !== artifact.url)], options);

export const removeResumeArtifactRecord = (
  current: ResumeArtifactRecord[],
  url: string,
  options: { maxItems?: number } = {}
) => {
  const normalizedUrl = normalizeAttachmentUrl(url);
  return sanitizeResumeArtifactLibrary(
    normalizedUrl ? current.filter(item => item.url !== normalizedUrl) : current,
    options
  );
};

export const mergeResumeArtifactLibraries = (
  serverArtifacts: ResumeArtifactRecord[],
  localArtifacts: ResumeArtifactRecord[],
  maxItems = defaultMaxResumeArtifacts
) => sanitizeResumeArtifactLibrary([...serverArtifacts, ...localArtifacts], {
  maxItems,
});

export const sanitizeResumeArtifactTombstones = (value: unknown): ResumeArtifactTombstone[] => {
  if (!Array.isArray(value)) return [];
  const seenUrls = new Set<string>();
  const tombstones: ResumeArtifactTombstone[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<ResumeArtifactTombstone>;
    const url = normalizeAttachmentUrl(candidate.url);
    if (!url || seenUrls.has(url)) continue;
    seenUrls.add(url);
    tombstones.push({
      url,
      fileName: sanitizeFileName(candidate.fileName),
      deletedAt: sanitizeIsoDate(candidate.deletedAt),
      persistedTo: candidate.persistedTo === 'server' ? 'server' : 'local',
    });
  }

  return tombstones.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()).slice(0, 20);
};

export const addResumeArtifactTombstone = (
  current: ResumeArtifactTombstone[],
  artifact: Pick<ResumeArtifactRecord, 'url'> & Partial<Pick<ResumeArtifactRecord, 'fileName' | 'persistedTo'>>,
  deletedAt = new Date().toISOString()
) => sanitizeResumeArtifactTombstones([{
  url: artifact.url,
  fileName: artifact.fileName,
  deletedAt,
  persistedTo: artifact.persistedTo,
}, ...current.filter(item => item.url !== artifact.url)]);

export const filterDeletedResumeArtifacts = (
  artifacts: ResumeArtifactRecord[],
  tombstones: ResumeArtifactTombstone[]
) => {
  const deletedUrls = new Set(tombstones.map(item => item.url));
  return artifacts.filter(artifact => !deletedUrls.has(artifact.url));
};

export const copyResumeArtifactUrl = async (url: string): Promise<string> => {
  const normalizedUrl = normalizeAttachmentUrl(url);
  if (!normalizedUrl) {
    throw new Error('Choose a valid uploaded PDF link before copying.');
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(normalizedUrl);
    return normalizedUrl;
  }

  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    throw new Error('Clipboard copy is unavailable in this browser.');
  }

  const textArea = document.createElement('textarea');
  textArea.value = normalizedUrl;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '0';
  document.body.appendChild(textArea);
  textArea.select();

  try {
    if (!document.execCommand('copy')) {
      throw new Error('Clipboard copy is unavailable in this browser.');
    }
  } finally {
    textArea.remove();
  }

  return normalizedUrl;
};
