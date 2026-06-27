import { Briefcase, ExternalLink, FileSearch, Plus, Save, Search, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import type { Job, JobScanDraft } from '../../lib/jobTypes';
import {
  countBand,
  recordExtensionOperationalEvent,
  sourceCategoryFromHost
} from '../../lib/operationalAnalytics';

interface JobsViewProps {
  jobs: Job[];
  jobDraft: JobScanDraft | null;
  handleAddJob: (company: string, role: string, status: Job['status']) => Promise<void>;
  handleDeleteJob: (id: string) => Promise<void>;
  handleUpdateStatus: (id: string, newStatus: Job['status']) => Promise<void>;
  handleSaveDraft: (draft: JobScanDraft) => Promise<void>;
  handleDiscardDraft: (draft?: JobScanDraft | null) => Promise<void>;
}

const inputClassName = 'w-full rounded-md border border-[var(--ext-border)] bg-[var(--ext-surface-inset)] px-2 py-1 text-xs text-[var(--ext-text)] transition focus:border-[var(--ext-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]';
const labelClassName = 'text-[10px] font-semibold text-[var(--ext-text-secondary)]';
const secondaryButtonClassName = 'rounded-md border border-[var(--ext-border)] bg-[var(--ext-surface-muted)] px-2 py-1 text-[10px] font-medium text-[var(--ext-text)] transition hover:border-[var(--ext-accent)] hover:bg-[var(--ext-accent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]';
const primaryButtonClassName = 'inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--ext-accent)] bg-[var(--ext-accent)] px-3 py-1.5 text-[11px] font-semibold text-[var(--ext-on-accent)] transition hover:bg-[var(--ext-accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] disabled:cursor-not-allowed disabled:border-[var(--ext-border)] disabled:bg-[var(--ext-surface-muted)] disabled:text-[var(--ext-text-muted)]';
const dangerButtonClassName = 'rounded-md border border-[var(--ext-danger)] bg-[var(--ext-danger-muted)] px-2 py-1 text-[10px] font-semibold text-[var(--ext-danger)] transition hover:bg-[var(--ext-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]';
const reviewPanelClassName = 'rounded-lg border border-[var(--ext-warning)] bg-[var(--ext-warning-muted)] p-3 space-y-2';
const cardClassName = 'rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-3';

export const JobsView: React.FC<JobsViewProps> = ({
  jobs,
  jobDraft,
  handleAddJob,
  handleDeleteJob,
  handleUpdateStatus,
  handleSaveDraft,
  handleDiscardDraft
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newStatus, setNewStatus] = useState<Job['status']>('Applied');
  const [draftForm, setDraftForm] = useState<JobScanDraft | null>(jobDraft);
  const [isDraftDiscardReviewOpen, setIsDraftDiscardReviewOpen] = useState(false);
  const [jobDeleteReview, setJobDeleteReview] = useState<Job | null>(null);

  useEffect(() => {
    setDraftForm(jobDraft);
    setIsDraftDiscardReviewOpen(false);
  }, [jobDraft]);

  useEffect(() => {
    if (jobDeleteReview && !jobs.some(job => job.id === jobDeleteReview.id)) {
      setJobDeleteReview(null);
    }
  }, [jobDeleteReview, jobs]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newRole) return;
    await handleAddJob(newCompany, newRole, newStatus);
    setNewCompany('');
    setNewRole('');
    setNewStatus('Applied');
    setShowAddForm(false);
  };

  const onSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftForm) return;
    await handleSaveDraft(draftForm);
  };

  const updateDraftField = <Key extends keyof JobScanDraft>(key: Key, value: JobScanDraft[Key]) => {
    setIsDraftDiscardReviewOpen(false);
    setDraftForm(curr => curr ? { ...curr, [key]: value } : curr);
  };

  const toggleAddForm = () => {
    const nextVisible = !showAddForm;
    setShowAddForm(nextVisible);
    void recordExtensionOperationalEvent({
      area: 'tracker',
      event: 'manual_add_form_toggled',
      metadata: {
        enabled: nextVisible,
        job_count: jobs.length,
        job_count_band: countBand(jobs.length),
        draft_present: Boolean(jobDraft)
      }
    });
  };

  const openDraftUrl = (url?: string, source?: string, entryPoint: 'draft' | 'tracked_job' = 'tracked_job') => {
    void recordExtensionOperationalEvent({
      area: 'tracker',
      event: 'posting_link_opened',
      metadata: {
        entry_point: entryPoint,
        posting_url_present: Boolean(url),
        source_category: sourceCategoryFromHost(source)
      }
    });

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const getJobDeleteMetadata = (job: Job) => ({
    entry_point: 'tracker_row',
    previous_status: job.status,
    posting_url_present: Boolean(job.url),
    details_present: Boolean(job.notes),
    job_count: jobs.length,
    job_count_band: countBand(jobs.length)
  });

  const getDraftDiscardMetadata = () => {
    const draft = draftForm || jobDraft;

    return {
      entry_point: 'scanned_draft',
      draft_present: Boolean(draft),
      draft_confidence: draft?.confidence,
      draft_status: draft?.status,
      posting_url_present: Boolean(draft?.url.trim()),
      details_present: Boolean(draft?.notes.trim()),
      source_category: sourceCategoryFromHost(draft?.source),
      job_count: jobs.length,
      job_count_band: countBand(jobs.length)
    };
  };

  const openDraftDiscardReview = () => {
    if (!draftForm && !jobDraft) return;
    setIsDraftDiscardReviewOpen(true);
    void recordExtensionOperationalEvent({
      area: 'tracker',
      event: 'scanned_draft_discard_review_opened',
      metadata: getDraftDiscardMetadata()
    });
  };

  const cancelDraftDiscardReview = () => {
    if (!isDraftDiscardReviewOpen) return;
    void recordExtensionOperationalEvent({
      area: 'tracker',
      event: 'scanned_draft_discard_cancelled',
      metadata: getDraftDiscardMetadata()
    });
    setIsDraftDiscardReviewOpen(false);
  };

  const confirmDraftDiscard = async () => {
    const draft = draftForm || jobDraft;
    if (!draft) return;

    setIsDraftDiscardReviewOpen(false);
    await handleDiscardDraft(draft);
  };

  const openJobDeleteReview = (job: Job) => {
    setJobDeleteReview(job);
    void recordExtensionOperationalEvent({
      area: 'tracker',
      event: 'job_delete_review_opened',
      metadata: getJobDeleteMetadata(job)
    });
  };

  const cancelJobDeleteReview = () => {
    if (!jobDeleteReview) return;
    void recordExtensionOperationalEvent({
      area: 'tracker',
      event: 'job_delete_cancelled',
      metadata: getJobDeleteMetadata(jobDeleteReview)
    });
    setJobDeleteReview(null);
  };

  const confirmJobDelete = async () => {
    if (!jobDeleteReview) return;
    const deleteRequest = jobDeleteReview;

    setJobDeleteReview(null);
    await handleDeleteJob(deleteRequest.id);
  };

  const filteredJobs = jobs.filter(j =>
    j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.role.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const hasTrackedJobs = jobs.length > 0;
  const hasSearchTerm = searchTerm.trim().length > 0;
  const draftSaveDisabled = !draftForm?.company.trim() || !draftForm?.role.trim();
  const emptyStateTitle = hasTrackedJobs ? 'No matching tracked jobs' : 'No tracked jobs yet';
  const emptyStateCopy = hasTrackedJobs
    ? 'Clear or adjust the filter to return to your saved local tracker rows.'
    : showAddForm
      ? 'Fill the manual form above or scan a posting from Dashboard to create an editable local draft.'
      : 'Add a job manually or scan a posting from Dashboard to create an editable local draft.';

  return (
    <div className="space-y-3" id="view-jobs">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 mr-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--ext-text-muted)]" />
          <input
            type="text"
            placeholder="Filter by company or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] py-1.5 pl-8 pr-3 text-xs text-[var(--ext-text)] placeholder-[var(--ext-text-muted)] transition focus:border-[var(--ext-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
            id="job-search-input"
          />
        </div>
        <button
          onClick={toggleAddForm}
          className="rounded-lg border border-[var(--ext-accent)] bg-[var(--ext-accent)] p-2 text-[var(--ext-on-accent)] transition hover:bg-[var(--ext-accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
          id="toggle-add-job-form"
          aria-controls="add-job-form"
          aria-expanded={showAddForm}
          aria-label={showAddForm ? 'Hide manual job form' : 'Show manual job form'}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {draftForm && (
        <form onSubmit={onSaveDraft} className={`${cardClassName} space-y-3`} id="scanned-job-draft">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="rounded-md border border-[var(--ext-border)] bg-[var(--ext-accent-muted)] p-1.5">
                <FileSearch className="h-3.5 w-3.5 text-[var(--ext-accent)]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-[var(--ext-text)]">Scanned job draft</h4>
                <p className="break-words text-[9px] text-[var(--ext-text-muted)]">{draftForm.source} - {draftForm.confidence} confidence</p>
              </div>
            </div>
            <button
              type="button"
              onClick={openDraftDiscardReview}
              className="rounded-md p-1 text-[var(--ext-text-muted)] transition hover:bg-[var(--ext-danger-muted)] hover:text-[var(--ext-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
              aria-controls="scanned-draft-discard-review"
              aria-expanded={isDraftDiscardReviewOpen}
              aria-label="Review scanned job draft discard"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {isDraftDiscardReviewOpen && (
            <div
              role="alert"
              className={reviewPanelClassName}
              id="scanned-draft-discard-review"
            >
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-[var(--ext-warning)]">Discard this scanned draft?</p>
                <p className="text-[9px] leading-relaxed text-[var(--ext-text-secondary)]">
                  This removes only the editable scanned draft for {draftForm.role || 'this role'} at {draftForm.company || 'this company'}. Tracked jobs, diagnostics analytics, prep cards, settings, and web-app applications stay unchanged.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelDraftDiscardReview}
                  className={secondaryButtonClassName}
                >
                  Keep Draft
                </button>
                <button
                  type="button"
                  onClick={confirmDraftDiscard}
                  className={dangerButtonClassName}
                >
                  Discard Draft
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={labelClassName}>Company</label>
              <input
                type="text"
                value={draftForm.company}
                onChange={(e) => updateDraftField('company', e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClassName}>Role</label>
              <input
                type="text"
                value={draftForm.role}
                onChange={(e) => updateDraftField('role', e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div className="space-y-1 min-w-0">
              <label className={labelClassName}>Posting URL</label>
              <input
                type="url"
                value={draftForm.url}
                onChange={(e) => updateDraftField('url', e.target.value)}
                className={inputClassName}
              />
            </div>
            <button
              type="button"
              onClick={() => openDraftUrl(draftForm.url, draftForm.source, 'draft')}
              disabled={!draftForm.url}
              className="rounded-md border border-[var(--ext-border)] bg-[var(--ext-surface-muted)] p-1.5 text-[var(--ext-text)] transition hover:border-[var(--ext-accent)] hover:bg-[var(--ext-accent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] disabled:cursor-not-allowed disabled:text-[var(--ext-text-muted)]"
              aria-label="Open scanned posting URL"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
            <div className="space-y-1">
              <label className={labelClassName}>Status</label>
              <select
                value={draftForm.status}
                onChange={(e) => updateDraftField('status', e.target.value as Job['status'])}
                className="rounded-md border border-[var(--ext-border)] bg-[var(--ext-surface-inset)] px-1.5 py-1 text-xs text-[var(--ext-text)] focus:border-[var(--ext-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClassName}>Notes</label>
              <textarea
                value={draftForm.notes}
                onChange={(e) => updateDraftField('notes', e.target.value)}
                rows={2}
                className={`${inputClassName} resize-none`}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={draftSaveDisabled}
              className={primaryButtonClassName}
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save to Tracker</span>
            </button>
          </div>
        </form>
      )}

      {showAddForm && (
        <form onSubmit={onSubmit} className={`${cardClassName} space-y-3`} id="add-job-form">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={labelClassName}>Company</label>
              <input
                type="text"
                placeholder="e.g. Google"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClassName}>Role</label>
              <input
                type="text"
                placeholder="e.g. Engineer"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className={labelClassName}>Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as Job['status'])}
                className="rounded-md border border-[var(--ext-border)] bg-[var(--ext-surface-inset)] px-1.5 py-0.5 text-xs text-[var(--ext-text)] focus:border-[var(--ext-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <button
              type="submit"
              className={primaryButtonClassName}
            >
              Add Job
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2 h-[260px] overflow-y-auto pr-0.5" id="jobs-list">
        {filteredJobs.map((job) => (
          <div key={job.id} className="space-y-2">
            <div
              className="group flex items-center justify-between gap-3 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-3 transition duration-200 hover:border-[var(--ext-border-strong)]"
            >
              <div className="min-w-0 space-y-1">
                <h4 className="break-words text-xs font-semibold text-[var(--ext-text)]">{job.role}</h4>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="break-words text-[10px] text-[var(--ext-text-secondary)]">{job.company}</span>
                  <span className="text-[9px] text-[var(--ext-text-muted)]">•</span>
                  <span className="text-[9px] text-[var(--ext-text-muted)]">{job.date}</span>
                  {job.source && (
                    <>
                      <span className="text-[9px] text-[var(--ext-text-muted)]">•</span>
                      <span className="break-all text-[9px] text-[var(--ext-text-muted)]">{job.source}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {job.url && (
                  <button
                    onClick={() => openDraftUrl(job.url, job.source, 'tracked_job')}
                    className="rounded-md p-1 text-[var(--ext-text-muted)] transition duration-150 hover:bg-[var(--ext-accent-muted)] hover:text-[var(--ext-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
                    aria-label={`Open posting for ${job.role}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}

                <select
                  value={job.status}
                  onChange={(e) => handleUpdateStatus(job.id, e.target.value as Job['status'])}
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] ${
                    job.status === 'Offered' ? 'border-[var(--ext-success)] bg-[var(--ext-success-muted)] text-[var(--ext-success)]' :
                    job.status === 'Interviewing' ? 'border-[var(--ext-accent)] bg-[var(--ext-accent-muted)] text-[var(--ext-accent)]' :
                    job.status === 'Applied' ? 'border-[var(--ext-border)] bg-[var(--ext-surface-muted)] text-[var(--ext-text-secondary)]' :
                    'border-[var(--ext-danger)] bg-[var(--ext-danger-muted)] text-[var(--ext-danger)]'
                  }`}
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offered">Offered</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <button
                  onClick={() => openJobDeleteReview(job)}
                  className="rounded-md p-1 text-[var(--ext-text-muted)] transition duration-150 hover:bg-[var(--ext-danger-muted)] hover:text-[var(--ext-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
                  aria-label={`Review removal for ${job.role}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {jobDeleteReview?.id === job.id && (
              <div
                role="alert"
                className={reviewPanelClassName}
                id={`job-delete-review-${job.id}`}
              >
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-[var(--ext-warning)]">Remove this tracked job?</p>
                  <p className="text-[9px] leading-relaxed text-[var(--ext-text-secondary)]">
                    This removes the local tracker row for {job.role} at {job.company}. Scanned drafts, diagnostics analytics, prep cards, settings, and web-app applications stay unchanged.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelJobDeleteReview}
                    className={secondaryButtonClassName}
                  >
                    Keep Job
                  </button>
                  <button
                    type="button"
                    onClick={confirmJobDelete}
                    className={dangerButtonClassName}
                  >
                    Remove Job
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredJobs.length === 0 && (
          <div className="rounded-lg border border-dashed border-[var(--ext-border)] bg-[var(--ext-surface)] p-4 text-center">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface-muted)]">
              <Briefcase className="h-4 w-4 text-[var(--ext-text-muted)]" />
            </div>
            <p className="text-xs font-semibold text-[var(--ext-text)]">{emptyStateTitle}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[var(--ext-text-muted)]">{emptyStateCopy}</p>
            {!hasTrackedJobs && !showAddForm && (
              <button
                type="button"
                onClick={toggleAddForm}
                className={`${secondaryButtonClassName} mt-3 inline-flex items-center justify-center px-3 py-1.5`}
              >
                Add Job
              </button>
            )}
            {hasTrackedJobs && hasSearchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className={`${secondaryButtonClassName} mt-3 inline-flex items-center justify-center px-3 py-1.5`}
              >
                Clear Filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
