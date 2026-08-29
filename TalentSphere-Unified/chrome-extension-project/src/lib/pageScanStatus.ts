import type { DraftConfidence } from './jobTypes';

export type PageScanStatusTone = 'info' | 'success' | 'warning';

export interface PageScanStatusCopy {
  tone: PageScanStatusTone;
  title: string;
  message: string;
}

export const pageScanStartedStatus: PageScanStatusCopy = {
  tone: 'info',
  title: 'Scanning active tab',
  message: 'Reading this tab locally. Review the draft before saving anything to Tracker.',
};

export const pageScanDraftReadyStatus: PageScanStatusCopy = {
  tone: 'success',
  title: 'Draft ready in Tracker',
  message: 'Review the scanned draft before saving it to your local tracker.',
};

export const pageScanLimitedDraftStatus: PageScanStatusCopy = {
  tone: 'warning',
  title: 'Draft needs review',
  message: 'The scan used limited tab details. Review company, role, URL, and notes before saving it to Tracker.',
};

export const pageScanNoDraftStatus: PageScanStatusCopy = {
  tone: 'warning',
  title: 'Page scan needs review',
  message: 'The active tab did not return a usable job draft. Open a supported job posting or add the role manually in Tracker.',
};

export const pageScanFailedStatus: PageScanStatusCopy = {
  tone: 'warning',
  title: 'Page scan could not run',
  message: 'The extension could not scan this tab. Reload the posting, open a supported job site, or add the role manually in Tracker.',
};

export const getPageScanDraftStatus = (confidence?: DraftConfidence | null): PageScanStatusCopy => (
  confidence === 'high' ? pageScanDraftReadyStatus : pageScanLimitedDraftStatus
);

export const getPageScanFailureStatus = (errorCategory?: string): PageScanStatusCopy => {
  if (errorCategory === 'active_tab_unavailable') {
    return {
      tone: 'warning',
      title: 'No active tab to scan',
      message: 'Open a job posting tab, then run Scan Webpage again.',
    };
  }

  if (errorCategory === 'permission_denied') {
    return {
      tone: 'warning',
      title: 'Scanning is not allowed on this tab',
      message: 'Use a supported job posting tab or add the role manually in Tracker.',
    };
  }

  if (errorCategory === 'messaging_unavailable') {
    return {
      tone: 'warning',
      title: 'Page scan could not reach this tab',
      message: 'Reload the posting or open a supported job site, then scan again.',
    };
  }

  return pageScanFailedStatus;
};

export const getScannedDraftReviewMessage = (confidence?: DraftConfidence | null) => (
  confidence === 'high'
    ? ''
    : 'This draft was created from limited page details. Review company, role, URL, and notes before saving it to Tracker.'
);
