import {
  DEFAULT_JOB_STATUS,
  type DraftConfidence,
  type JobScanDraft,
  type PageScanMetadata
} from './jobTypes';

export interface PageScanTabSnapshot {
  title?: string;
  url?: string;
}

export const normalizePageScanText = (value?: string | null) => (value || '').replace(/\s+/g, ' ').trim();

export const hostFromUrl = (url?: string) => {
  if (!url) {
    return '';
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export const parsePageScanTitle = (title?: string) => {
  const cleaned = normalizePageScanText(title);
  const atParts = cleaned.split(/\s+at\s+/i);

  if (atParts.length >= 2) {
    return {
      role: normalizePageScanText(atParts[0]),
      company: normalizePageScanText(atParts.slice(1).join(' at ').split(/\s(?:-|\|)\s/)[0])
    };
  }

  const splitParts = cleaned.split(/\s(?:-|\|)\s/).map(normalizePageScanText).filter(Boolean);

  return {
    role: splitParts[0] || cleaned,
    company: splitParts.length > 1 ? splitParts[1] : ''
  };
};

const getDraftConfidence = (
  metadataConfidence: DraftConfidence | undefined,
  role: string,
  company: string
): DraftConfidence => metadataConfidence || (company && role ? 'medium' : 'low');

export const buildJobScanDraft = ({
  metadata,
  tab,
  id,
  scannedAt,
}: {
  metadata?: PageScanMetadata;
  tab?: PageScanTabSnapshot;
  id: string;
  scannedAt: string;
}): JobScanDraft => {
  const url = normalizePageScanText(metadata?.url || tab?.url || '');
  const source = normalizePageScanText(metadata?.source || hostFromUrl(url) || 'active-tab');
  const parsedTitle = parsePageScanTitle(metadata?.rawTitle || tab?.title);
  const description = normalizePageScanText(metadata?.description);
  const role = normalizePageScanText(metadata?.role) || parsedTitle.role || 'Current page';
  const company = normalizePageScanText(metadata?.company) || parsedTitle.company;
  const notes = description ? `Scanned page excerpt: ${description.slice(0, 320)}` : '';

  return {
    id,
    company,
    role,
    status: DEFAULT_JOB_STATUS,
    url,
    source,
    notes,
    scannedAt,
    confidence: getDraftConfidence(metadata?.confidence, role, company),
    rawTitle: metadata?.rawTitle || tab?.title
  };
};
