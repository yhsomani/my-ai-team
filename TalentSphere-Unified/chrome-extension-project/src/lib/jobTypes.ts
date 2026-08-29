export type JobStatus = 'Applied' | 'Interviewing' | 'Offered' | 'Rejected';

export type DraftConfidence = 'high' | 'medium' | 'low';

export interface Job {
  id: string;
  company: string;
  role: string;
  status: JobStatus;
  date: string;
  url?: string;
  source?: string;
  notes?: string;
}

export interface PageScanMetadata {
  status: 'success' | 'error';
  role?: string;
  company?: string;
  url?: string;
  source?: string;
  description?: string;
  rawTitle?: string;
  confidence?: DraftConfidence;
  error?: string;
}

export interface JobScanDraft {
  id: string;
  company: string;
  role: string;
  status: JobStatus;
  url: string;
  source: string;
  notes: string;
  scannedAt: string;
  confidence: DraftConfidence;
  rawTitle?: string;
}

export const TRACKED_JOBS_STORAGE_KEY = 'ts_jobs';
export const JOB_SCAN_DRAFT_STORAGE_KEY = 'ts_job_draft';
export const DEFAULT_JOB_STATUS: JobStatus = 'Applied';
