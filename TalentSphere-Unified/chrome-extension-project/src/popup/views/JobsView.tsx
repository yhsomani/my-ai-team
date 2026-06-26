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
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Filter by company or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition"
            id="job-search-input"
          />
        </div>
        <button
          onClick={toggleAddForm}
          className="bg-cyan-600 hover:bg-cyan-500 shadow-neonGlow text-white p-2 rounded-lg transition"
          id="toggle-add-job-form"
          aria-controls="add-job-form"
          aria-expanded={showAddForm}
          aria-label={showAddForm ? 'Hide manual job form' : 'Show manual job form'}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {draftForm && (
        <form onSubmit={onSaveDraft} className="bg-slate-900/90 border border-cyan-900/60 rounded-lg p-3 space-y-3 shadow-2xl" id="scanned-job-draft">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="bg-cyan-950/60 border border-cyan-900/60 p-1.5 rounded-md">
                <FileSearch className="h-3.5 w-3.5 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-white">Scanned job draft</h4>
                <p className="text-[9px] text-slate-500 truncate">{draftForm.source} - {draftForm.confidence} confidence</p>
              </div>
            </div>
            <button
              type="button"
              onClick={openDraftDiscardReview}
              className="text-slate-500 hover:text-rose-300 p-1 rounded-md transition"
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
              className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 space-y-2"
              id="scanned-draft-discard-review"
            >
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-amber-200">Discard this scanned draft?</p>
                <p className="text-[9px] leading-relaxed text-amber-100/80">
                  This removes only the editable scanned draft for {draftForm.role || 'this role'} at {draftForm.company || 'this company'}. Tracked jobs, diagnostics analytics, prep cards, settings, and web-app applications stay unchanged.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelDraftDiscardReview}
                  className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
                >
                  Keep Draft
                </button>
                <button
                  type="button"
                  onClick={confirmDraftDiscard}
                  className="rounded-md border border-rose-700/60 bg-rose-950/70 px-2 py-1 text-[10px] font-semibold text-rose-200 hover:bg-rose-900/80"
                >
                  Discard Draft
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Company</label>
              <input
                type="text"
                value={draftForm.company}
                onChange={(e) => updateDraftField('company', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Role</label>
              <input
                type="text"
                value={draftForm.role}
                onChange={(e) => updateDraftField('role', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div className="space-y-1 min-w-0">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Posting URL</label>
              <input
                type="url"
                value={draftForm.url}
                onChange={(e) => updateDraftField('url', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="button"
              onClick={() => openDraftUrl(draftForm.url, draftForm.source, 'draft')}
              disabled={!draftForm.url}
              className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-200 border border-slate-700 rounded-md p-1.5 transition"
              aria-label="Open scanned posting URL"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-2 items-start">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
              <select
                value={draftForm.status}
                onChange={(e) => updateDraftField('status', e.target.value as Job['status'])}
                className="bg-slate-950 border border-slate-800 rounded-md px-1.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Notes</label>
              <textarea
                value={draftForm.notes}
                onChange={(e) => updateDraftField('notes', e.target.value)}
                rows={2}
                className="w-full resize-none bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={draftSaveDisabled}
              className="inline-flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-md transition"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save to Tracker</span>
            </button>
          </div>
        </form>
      )}

      {showAddForm && (
        <form onSubmit={onSubmit} className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 space-y-3 shadow-2xl" id="add-job-form">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Company</label>
              <input
                type="text"
                placeholder="e.g. Google"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Role</label>
              <input
                type="text"
                placeholder="e.g. Engineer"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as Job['status'])}
                className="bg-slate-950 border border-slate-850 rounded px-1.5 py-0.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold px-3 py-1 rounded-md transition"
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
              className="group bg-slate-900/30 hover:bg-slate-900/70 border border-slate-800/40 hover:border-slate-800/80 rounded-xl p-3 flex justify-between items-center transition duration-200"
            >
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-white tracking-wide">{job.role}</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-400">{job.company}</span>
                  <span className="text-[9px] text-slate-600">•</span>
                  <span className="text-[9px] text-slate-500">{job.date}</span>
                  {job.source && (
                    <>
                      <span className="text-[9px] text-slate-600">•</span>
                      <span className="text-[9px] text-slate-500">{job.source}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {job.url && (
                  <button
                    onClick={() => openDraftUrl(job.url, job.source, 'tracked_job')}
                    className="text-slate-600 hover:text-cyan-300 p-1 rounded-md transition duration-150"
                    aria-label={`Open posting for ${job.role}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}

                <select
                  value={job.status}
                  onChange={(e) => handleUpdateStatus(job.id, e.target.value as Job['status'])}
                  className={`text-[10px] font-semibold border-0 rounded px-1.5 py-0.5 focus:outline-none ${
                    job.status === 'Offered' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40' :
                    job.status === 'Interviewing' ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-900/40' :
                    job.status === 'Applied' ? 'bg-slate-800/80 text-slate-300 border border-slate-700/50' :
                    'bg-rose-950/60 text-rose-400 border border-rose-900/40'
                  }`}
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offered">Offered</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <button
                  onClick={() => openJobDeleteReview(job)}
                  className="text-slate-600 hover:text-rose-400 p-1 rounded-md transition duration-150"
                  aria-label={`Review removal for ${job.role}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {jobDeleteReview?.id === job.id && (
              <div
                role="alert"
                className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 space-y-2"
                id={`job-delete-review-${job.id}`}
              >
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-amber-200">Remove this tracked job?</p>
                  <p className="text-[9px] leading-relaxed text-amber-100/80">
                    This removes the local tracker row for {job.role} at {job.company}. Scanned drafts, diagnostics analytics, prep cards, settings, and web-app applications stay unchanged.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelJobDeleteReview}
                    className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
                  >
                    Keep Job
                  </button>
                  <button
                    type="button"
                    onClick={confirmJobDelete}
                    className="rounded-md border border-rose-700/60 bg-rose-950/70 px-2 py-1 text-[10px] font-semibold text-rose-200 hover:bg-rose-900/80"
                  >
                    Remove Job
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredJobs.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-4 text-center">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/70">
              <Briefcase className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-xs font-semibold text-slate-200">{emptyStateTitle}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{emptyStateCopy}</p>
            {!hasTrackedJobs && !showAddForm && (
              <button
                type="button"
                onClick={toggleAddForm}
                className="mt-3 inline-flex items-center justify-center rounded-md border border-cyan-800/60 bg-cyan-950/40 px-3 py-1.5 text-[10px] font-semibold text-cyan-200 hover:bg-cyan-900/50"
              >
                Add Job
              </button>
            )}
            {hasTrackedJobs && hasSearchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="mt-3 inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[10px] font-semibold text-slate-300 hover:bg-slate-800"
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
