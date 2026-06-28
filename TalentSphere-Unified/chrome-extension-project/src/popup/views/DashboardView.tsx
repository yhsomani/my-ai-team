import { AlertTriangle, Sparkles, Clock, CheckCircle2, FileText, ScanSearch } from 'lucide-react';
import React from 'react';

import type { Job } from '../../lib/jobTypes';
import type { PageScanStatusCopy } from '../../lib/pageScanStatus';

interface DashboardViewProps {
  jobs: Job[];
  statusCounts: { Applied: number; Interviewing: number; Offered: number; Rejected: number };
  openOptionsPage: () => void;
  triggerPageScan: () => void;
  isScanningPage: boolean;
  hasDraft: boolean;
  pageScanStatus: PageScanStatusCopy | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  jobs,
  statusCounts,
  openOptionsPage,
  triggerPageScan,
  isScanningPage,
  hasDraft,
  pageScanStatus
}) => {
  const scanStatusClassName = pageScanStatus?.tone === 'warning'
    ? 'border-[var(--ext-warning)] bg-[var(--ext-warning-muted)]'
    : pageScanStatus?.tone === 'success'
      ? 'border-[var(--ext-success)] bg-[var(--ext-success-muted)]'
      : 'border-[var(--ext-border)] bg-[var(--ext-surface-muted)]';
  const ScanStatusIcon = pageScanStatus?.tone === 'warning'
    ? AlertTriangle
    : pageScanStatus?.tone === 'success'
      ? CheckCircle2
      : ScanSearch;

  return (
    <div className="space-y-4" id="view-dashboard">
      <div className="rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[var(--ext-text-secondary)]">Tracked Jobs</span>
          <Sparkles className="h-4 w-4 text-[var(--ext-warning)]" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[var(--ext-text)]">{jobs.length}</span>
          <span className="text-xs text-[var(--ext-text-muted)]">local tracker records</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col justify-between rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--ext-accent)]" />
            <span className="text-[11px] font-medium text-[var(--ext-text-secondary)]">Interviewing</span>
          </div>
          <span className="mt-1 text-xl font-semibold text-[var(--ext-text)]">{statusCounts.Interviewing}</span>
        </div>
        <div className="flex flex-col justify-between rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--ext-success)]" />
            <span className="text-[11px] font-medium text-[var(--ext-text-secondary)]">Offered</span>
          </div>
          <span className="mt-1 text-xl font-semibold text-[var(--ext-text)]">{statusCounts.Offered}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-accent-muted)] p-2">
            <FileText className="h-4 w-4 text-[var(--ext-accent)]" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-[var(--ext-text)]">Resume Match Preview</h4>
            <p className="mt-0.5 break-words text-[10px] text-[var(--ext-text-secondary)]">Compare pasted job and resume text locally in the options panel.</p>
          </div>
        </div>
        <button
          onClick={openOptionsPage}
          className="rounded-md border border-[var(--ext-accent)] bg-[var(--ext-accent)] px-2.5 py-1.5 text-xs font-medium text-[var(--ext-on-accent)] transition duration-200 hover:bg-[var(--ext-accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
        >
          Launch
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[11px] font-semibold text-[var(--ext-text)]">Page Scan Draft</span>
          <span className="mt-0.5 break-words text-[9px] text-[var(--ext-text-muted)]">
            {hasDraft ? 'Editable draft ready in Tracker.' : 'Create an editable local draft from the current page.'}
          </span>
        </div>
        <button
          onClick={triggerPageScan}
          disabled={isScanningPage}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--ext-border)] bg-[var(--ext-surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--ext-text)] transition duration-200 hover:border-[var(--ext-accent)] hover:bg-[var(--ext-accent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] disabled:cursor-not-allowed disabled:text-[var(--ext-text-muted)]"
          id="tab-analyze-btn"
        >
          <ScanSearch className="h-3.5 w-3.5" />
          <span>{isScanningPage ? 'Scanning' : 'Scan Webpage'}</span>
        </button>
      </div>

      {pageScanStatus && (
        <div
          role={pageScanStatus.tone === 'warning' ? 'alert' : 'status'}
          aria-live="polite"
          className={`flex items-start gap-2 rounded-lg border p-3 ${scanStatusClassName}`}
          id="page-scan-status"
        >
          <ScanStatusIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ext-text)]" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[var(--ext-text)]">{pageScanStatus.title}</p>
            <p className="mt-0.5 break-words text-[9px] leading-relaxed text-[var(--ext-text-secondary)]">
              {pageScanStatus.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
