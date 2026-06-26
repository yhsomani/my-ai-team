import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Briefcase, BarChart3, Terminal, ExternalLink } from 'lucide-react';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { extMessaging } from '../lib/messaging';
import {
  EXTENSION_OPERATIONAL_ANALYTICS_STORAGE_KEY,
  categorizeExtensionError,
  countBand,
  type ExtensionOperationalEvent,
  recordExtensionOperationalEvent,
  sourceCategoryFromHost,
  textLengthBand
} from '../lib/operationalAnalytics';
import {
  JOB_SCAN_DRAFT_STORAGE_KEY,
  TRACKED_JOBS_STORAGE_KEY,
  type Job,
  type JobScanDraft
} from '../lib/jobTypes';

import { DashboardView } from './views/DashboardView';
import { JobsView } from './views/JobsView';
import { DiagnosticsView } from './views/DiagnosticsView';

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'warn';
  message: string;
}

export function PopupApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'logs'>('dashboard');
  const [isScanningPage, setIsScanningPage] = useState(false);
  const [isConsoleLogsClearReviewOpen, setIsConsoleLogsClearReviewOpen] = useState(false);
  const [isOperationalAnalyticsClearReviewOpen, setIsOperationalAnalyticsClearReviewOpen] = useState(false);
  const hasRecordedOpen = useRef(false);
  const [jobs, setJobs, jobsLoading] = useChromeStorage<Job[]>(TRACKED_JOBS_STORAGE_KEY, []);
  const [jobDraft, setJobDraft, draftLoading] = useChromeStorage<JobScanDraft | null>(JOB_SCAN_DRAFT_STORAGE_KEY, null);
  const [
    operationalEvents,
    setOperationalEvents,
    operationalEventsLoading
  ] = useChromeStorage<ExtensionOperationalEvent[]>(EXTENSION_OPERATIONAL_ANALYTICS_STORAGE_KEY, []);
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: '21:08:12', type: 'info', message: 'TalentSphere Companion initialized.' },
    { time: '21:08:13', type: 'success', message: 'Successfully connected to Local Storage API.' }
  ]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setLogs(curr => [{ time: timeStr, type, message }, ...curr]);
  }, []);

  const statusCounts = useMemo(() => ({
    Applied: jobs.filter(j => j.status === 'Applied').length,
    Interviewing: jobs.filter(j => j.status === 'Interviewing').length,
    Offered: jobs.filter(j => j.status === 'Offered').length,
    Rejected: jobs.filter(j => j.status === 'Rejected').length,
  }), [jobs]);

  const workflowMetadata = useCallback(() => ({
    job_count: jobs.length,
    job_count_band: countBand(jobs.length),
    draft_present: Boolean(jobDraft),
    status_applied: statusCounts.Applied,
    status_interviewing: statusCounts.Interviewing,
    status_offered: statusCounts.Offered,
    status_rejected: statusCounts.Rejected
  }), [jobDraft, jobs.length, statusCounts]);

  const operationalAnalyticsSummary = useMemo(() => {
    const safeEvents = Array.isArray(operationalEvents) ? operationalEvents : [];
    const lastEvent = safeEvents[safeEvents.length - 1];

    return {
      eventCount: safeEvents.length,
      lastEventLabel: lastEvent ? `${lastEvent.area}:${lastEvent.event}` : 'No events',
      lastOccurredAt: lastEvent?.occurredAt || ''
    };
  }, [operationalEvents]);

  useEffect(() => {
    if (operationalAnalyticsSummary.eventCount === 0 && isOperationalAnalyticsClearReviewOpen) {
      setIsOperationalAnalyticsClearReviewOpen(false);
    }
  }, [isOperationalAnalyticsClearReviewOpen, operationalAnalyticsSummary.eventCount]);

  useEffect(() => {
    if (logs.length === 0 && isConsoleLogsClearReviewOpen) {
      setIsConsoleLogsClearReviewOpen(false);
    }
  }, [isConsoleLogsClearReviewOpen, logs.length]);

  useEffect(() => {
    if (jobsLoading || draftLoading || hasRecordedOpen.current) {
      return;
    }

    hasRecordedOpen.current = true;
    void recordExtensionOperationalEvent({
      area: 'popup',
      event: 'popup_opened',
      metadata: workflowMetadata()
    });
  }, [draftLoading, jobsLoading, workflowMetadata]);

  const handlePopupTabChange = useCallback((nextTab: 'dashboard' | 'jobs' | 'logs') => {
    if (activeTab !== nextTab) {
      void recordExtensionOperationalEvent({
        area: 'popup',
        event: 'tab_changed',
        metadata: {
          previous_tab: activeTab,
          next_tab: nextTab,
          ...workflowMetadata()
        }
      });
    }

    setActiveTab(nextTab);
  }, [activeTab, workflowMetadata]);

  const handleAddJob = useCallback(async (
    newCompany: string,
    newRole: string,
    newStatus: Job['status'],
    details: Pick<Partial<Job>, 'url' | 'source' | 'notes'> = {}
  ) => {
    const newJob: Job = {
      id: Date.now().toString(),
      company: newCompany,
      role: newRole,
      status: newStatus,
      date: new Date().toISOString().split('T')[0],
      ...details
    };

    await setJobs(curr => [...curr, newJob]);
    addLog(`Tracked new job: ${newRole} at ${newCompany}.`, 'success');
    void recordExtensionOperationalEvent({
      area: 'tracker',
      event: 'job_added',
      metadata: {
        source_type: details.source ? 'scanned_draft' : 'manual',
        next_status: newStatus,
        posting_url_present: Boolean(details.url),
        details_present: Boolean(details.notes),
        job_count: jobs.length + 1,
        job_count_band: countBand(jobs.length + 1)
      }
    });
  }, [setJobs, addLog, jobs.length]);

  const handleDeleteJob = useCallback(async (id: string) => {
    const jobToDelete = jobs.find(j => j.id === id);
    await setJobs(curr => curr.filter(j => j.id !== id));
    if (jobToDelete) {
      addLog(`Removed tracked job: ${jobToDelete.role} at ${jobToDelete.company}.`, 'info');
      void recordExtensionOperationalEvent({
        area: 'tracker',
        event: 'job_deleted',
        metadata: {
          previous_status: jobToDelete.status,
          job_count: Math.max(jobs.length - 1, 0),
          job_count_band: countBand(Math.max(jobs.length - 1, 0)),
          posting_url_present: Boolean(jobToDelete.url),
          details_present: Boolean(jobToDelete.notes)
        }
      });
    }
  }, [jobs, setJobs, addLog]);

  const handleUpdateStatus = useCallback(async (id: string, newStatus: Job['status']) => {
    await setJobs(curr => curr.map(j => j.id === id ? { ...j, status: newStatus } : j));
    const updatedJob = jobs.find(j => j.id === id);
    if (updatedJob) {
      addLog(`Updated status of ${updatedJob.role} at ${updatedJob.company} to "${newStatus}".`, 'success');
      void recordExtensionOperationalEvent({
        area: 'tracker',
        event: 'job_status_changed',
        metadata: {
          previous_status: updatedJob.status,
          next_status: newStatus,
          job_count: jobs.length,
          job_count_band: countBand(jobs.length)
        }
      });
    }
  }, [jobs, setJobs, addLog]);

  const handleSaveDraft = useCallback(async (draft: JobScanDraft) => {
    const company = draft.company.trim();
    const role = draft.role.trim();

    if (!company || !role) {
      addLog('Scanned draft needs both company and role before saving.', 'warn');
      void recordExtensionOperationalEvent({
        area: 'tracker',
        event: 'scanned_draft_validation_failed',
        metadata: {
          draft_confidence: draft.confidence,
          role_present: Boolean(role),
          company_present: Boolean(company),
          missing_field_count: Number(!role) + Number(!company)
        }
      });
      return;
    }

    const newJob: Job = {
      id: Date.now().toString(),
      company,
      role,
      status: draft.status,
      date: new Date().toISOString().split('T')[0],
      url: draft.url.trim() || undefined,
      source: draft.source.trim() || undefined,
      notes: draft.notes.trim() || undefined
    };

    await setJobs(curr => [...curr, newJob]);
    await setJobDraft(null);
    addLog(`Saved scanned draft: ${role} at ${company}.`, 'success');
    void recordExtensionOperationalEvent({
      area: 'tracker',
      event: 'scanned_draft_saved',
      metadata: {
        draft_confidence: draft.confidence,
        draft_status: draft.status,
        source_category: sourceCategoryFromHost(draft.source),
        role_present: Boolean(role),
        company_present: Boolean(company),
        posting_url_present: Boolean(draft.url.trim()),
        details_present: Boolean(draft.notes.trim()),
        description_length_band: textLengthBand(draft.notes),
        job_count: jobs.length + 1,
        job_count_band: countBand(jobs.length + 1)
      }
    });
  }, [addLog, jobs.length, setJobDraft, setJobs]);

  const handleDiscardDraft = useCallback(async (draftSnapshot?: JobScanDraft | null) => {
    const draft = draftSnapshot ?? jobDraft;

    await setJobDraft(null);
    addLog('Discarded scanned job draft.', 'info');
    void recordExtensionOperationalEvent({
      area: 'tracker',
      event: 'scanned_draft_discarded',
      metadata: {
        draft_confidence: draft?.confidence,
        draft_status: draft?.status,
        source_category: sourceCategoryFromHost(draft?.source)
      }
    });
  }, [addLog, jobDraft, setJobDraft]);

  const triggerPageScan = useCallback(async () => {
    if (isScanningPage) {
      return;
    }

    try {
      setIsScanningPage(true);
      addLog('Requesting active tab DOM parsing from background service worker...', 'info');
      void recordExtensionOperationalEvent({
        area: 'page_scan',
        event: 'page_scan_requested',
        metadata: workflowMetadata()
      });
      const response = await extMessaging.sendMessage({ action: 'analyze_page' });

      if (response?.status === 'success' && response.draft) {
        await setJobDraft(response.draft);
        setActiveTab('jobs');
        addLog(`Prepared tab scan draft: "${response.summary}"`, 'success');
        void recordExtensionOperationalEvent({
          area: 'page_scan',
          event: 'page_scan_draft_prepared',
          metadata: {
            draft_confidence: response.draft.confidence,
            draft_status: response.draft.status,
            source_category: sourceCategoryFromHost(response.draft.source),
            role_present: Boolean(response.draft.role),
            company_present: Boolean(response.draft.company),
            posting_url_present: Boolean(response.draft.url),
            details_present: Boolean(response.draft.notes),
            summary_present: Boolean(response.summary)
          }
        });
        return;
      }

      addLog(`Page scan did not return a draft: ${response?.error || 'No response details.'}`, 'warn');
      void recordExtensionOperationalEvent({
        area: 'page_scan',
        event: 'page_scan_no_draft',
        metadata: {
          response_status: response?.status || 'missing_response',
          error_category: categorizeExtensionError(response?.error)
        }
      });
    } catch (err) {
      addLog(`Page scan failed: ${err instanceof Error ? err.message : String(err)}`, 'warn');
      void recordExtensionOperationalEvent({
        area: 'page_scan',
        event: 'page_scan_failed',
        metadata: {
          error_category: categorizeExtensionError(err)
        }
      });
    } finally {
      setIsScanningPage(false);
    }
  }, [addLog, isScanningPage, setJobDraft, workflowMetadata]);

  const openOptionsPage = useCallback(() => {
    void recordExtensionOperationalEvent({
      area: 'popup',
      event: 'options_page_opened',
      metadata: {
        entry_point: activeTab,
        ...workflowMetadata()
      }
    });

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('../options/index.html', '_blank');
    }
  }, [activeTab, workflowMetadata]);

  const pingWorker = useCallback(async () => {
    addLog('Testing messaging connectivity to extension options thread...', 'info');
    void recordExtensionOperationalEvent({
      area: 'diagnostics',
      event: 'worker_ping_requested',
      metadata: {
        message_action: 'ping'
      }
    });

    try {
      const resp = await extMessaging.sendMessage({ action: 'ping' });
      if (resp?.status === 'active') {
        addLog(`Received connection ping reply: ${JSON.stringify(resp)}`, 'success');
        void recordExtensionOperationalEvent({
          area: 'diagnostics',
          event: 'worker_ping_succeeded',
          metadata: {
            message_action: 'ping',
            response_status: resp?.status || 'missing_status'
          }
        });
        return;
      }

      addLog(`Connection ping unavailable: ${resp?.error || 'Background worker did not report active status.'}`, 'warn');
      void recordExtensionOperationalEvent({
        area: 'diagnostics',
        event: 'worker_ping_failed',
        metadata: {
          message_action: 'ping',
          response_status: resp?.status || 'missing_status',
          error_category: categorizeExtensionError(resp?.error || resp?.status)
        }
      });
    } catch (err) {
      addLog(`Connection ping failed: ${err instanceof Error ? err.message : String(err)}`, 'warn');
      void recordExtensionOperationalEvent({
        area: 'diagnostics',
        event: 'worker_ping_failed',
        metadata: {
          message_action: 'ping',
          error_category: categorizeExtensionError(err)
        }
      });
    }
  }, [addLog]);

  const getConsoleLogClearMetadata = useCallback(() => ({
    clear_scope: 'console_logs',
    entry_point: 'diagnostics',
    log_count: logs.length
  }), [logs.length]);

  const openConsoleLogsClearReview = useCallback(() => {
    if (logs.length === 0) {
      setIsConsoleLogsClearReviewOpen(false);
      return;
    }

    setIsConsoleLogsClearReviewOpen(true);
    void recordExtensionOperationalEvent({
      area: 'diagnostics',
      event: 'console_logs_clear_review_opened',
      metadata: getConsoleLogClearMetadata()
    });
  }, [getConsoleLogClearMetadata, logs.length]);

  const cancelConsoleLogsClearReview = useCallback(() => {
    if (!isConsoleLogsClearReviewOpen) return;

    setIsConsoleLogsClearReviewOpen(false);
    void recordExtensionOperationalEvent({
      area: 'diagnostics',
      event: 'console_logs_clear_cancelled',
      metadata: getConsoleLogClearMetadata()
    });
  }, [getConsoleLogClearMetadata, isConsoleLogsClearReviewOpen]);

  const clearLogs = useCallback(() => {
    const logCount = logs.length;

    if (logCount === 0) {
      setIsConsoleLogsClearReviewOpen(false);
      return;
    }

    setLogs([]);
    setIsConsoleLogsClearReviewOpen(false);
    void recordExtensionOperationalEvent({
      area: 'diagnostics',
      event: 'logs_cleared',
      metadata: {
        clear_scope: 'console_logs',
        entry_point: 'diagnostics',
        log_count: logCount
      }
    });
  }, [logs.length]);

  const logDiagnosticTestEvent = useCallback(() => {
    addLog('Logged a local diagnostics test event for this popup session.', 'info');
    void recordExtensionOperationalEvent({
      area: 'diagnostics',
      event: 'local_diagnostic_test_event_logged',
      metadata: {
        entry_point: 'diagnostics',
        diagnostic_action: 'manual_test_event'
      }
    });
  }, [addLog]);

  const exportOperationalAnalytics = useCallback(() => {
    const safeEvents = Array.isArray(operationalEvents) ? operationalEvents : [];

    if (safeEvents.length === 0) {
      addLog('No local analytics events are available to export.', 'warn');
      return;
    }

    const exportedAt = new Date().toISOString();
    const payload = JSON.stringify({
      exportedAt,
      source: 'talentsphere_companion',
      eventCount: safeEvents.length,
      events: safeEvents
    }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `talentsphere-extension-diagnostics-${exportedAt.slice(0, 10)}.json`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    addLog(`Exported ${safeEvents.length} local analytics events.`, 'success');
    void recordExtensionOperationalEvent({
      area: 'diagnostics',
      event: 'operational_analytics_exported',
      metadata: {
        event_count: safeEvents.length
      }
    });
  }, [addLog, operationalEvents]);

  const openOperationalAnalyticsClearReview = useCallback(() => {
    const safeEvents = Array.isArray(operationalEvents) ? operationalEvents : [];

    if (safeEvents.length === 0) {
      addLog('No local analytics events are available to clear.', 'warn');
      return;
    }

    setIsOperationalAnalyticsClearReviewOpen(true);
    void recordExtensionOperationalEvent({
      area: 'diagnostics',
      event: 'operational_analytics_clear_review_opened',
      metadata: {
        event_count: safeEvents.length,
        clear_scope: 'local_analytics_queue',
        entry_point: 'diagnostics'
      }
    });
  }, [addLog, operationalEvents]);

  const cancelOperationalAnalyticsClearReview = useCallback(() => {
    const safeEvents = Array.isArray(operationalEvents) ? operationalEvents : [];

    setIsOperationalAnalyticsClearReviewOpen(false);
    void recordExtensionOperationalEvent({
      area: 'diagnostics',
      event: 'operational_analytics_clear_cancelled',
      metadata: {
        event_count: safeEvents.length,
        clear_scope: 'local_analytics_queue',
        entry_point: 'diagnostics'
      }
    });
  }, [operationalEvents]);

  const confirmOperationalAnalyticsClear = useCallback(async () => {
    const safeEvents = Array.isArray(operationalEvents) ? operationalEvents : [];

    if (safeEvents.length === 0) {
      setIsOperationalAnalyticsClearReviewOpen(false);
      addLog('No local analytics events are available to clear.', 'warn');
      return;
    }

    await setOperationalEvents([]);
    setIsOperationalAnalyticsClearReviewOpen(false);
    addLog(`Cleared ${safeEvents.length} local analytics events.`, 'success');
  }, [addLog, operationalEvents, setOperationalEvents]);

  return (
    <div className="flex flex-col h-[520px] bg-slate-950 text-slate-100 antialiased font-sans select-none border border-slate-800 rounded-lg overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
          </div>
          <span className="font-semibold text-lg font-outfit tracking-wide bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            TalentSphere Companion
          </span>
        </div>
        <button 
          onClick={openOptionsPage} 
          className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-900/60 rounded-md px-2 py-1 transition duration-200"
          id="open-options-btn"
        >
          <span className="font-medium">Dashboard</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </header>

      <nav className="flex px-3 py-2 bg-slate-950/80 border-b border-slate-800/60 space-x-1">
        <button
          onClick={() => handlePopupTabChange('dashboard')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-md text-xs font-medium transition duration-200 ${
            activeTab === 'dashboard'
              ? 'bg-slate-800/80 text-white shadow-inner border border-slate-700/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
          id="nav-dashboard-tab"
        >
          <BarChart3 className="h-3.5 w-3.5 text-purple-400" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => handlePopupTabChange('jobs')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-md text-xs font-medium transition duration-200 ${
            activeTab === 'jobs'
              ? 'bg-slate-800/80 text-white shadow-inner border border-slate-700/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
          id="nav-jobs-tab"
        >
          <Briefcase className="h-3.5 w-3.5 text-cyan-400" />
          <span>Tracker</span>
        </button>
        <button
          onClick={() => handlePopupTabChange('logs')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-md text-xs font-medium transition duration-200 ${
            activeTab === 'logs'
              ? 'bg-slate-800/80 text-white shadow-inner border border-slate-700/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
          id="nav-logs-tab"
        >
          <Terminal className="h-3.5 w-3.5 text-emerald-400" />
          <span>Diagnostics</span>
        </button>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 bg-slate-950/40">
        {activeTab === 'dashboard' && (
          <DashboardView 
            jobs={jobs} 
            statusCounts={statusCounts} 
            openOptionsPage={openOptionsPage} 
            triggerPageScan={triggerPageScan}
            isScanningPage={isScanningPage}
            hasDraft={Boolean(jobDraft)}
          />
        )}
        
        {activeTab === 'jobs' && (
          <JobsView 
            jobs={jobs} 
            jobDraft={jobDraft}
            handleAddJob={handleAddJob} 
            handleDeleteJob={handleDeleteJob} 
            handleUpdateStatus={handleUpdateStatus} 
            handleSaveDraft={handleSaveDraft}
            handleDiscardDraft={handleDiscardDraft}
          />
        )}

        {activeTab === 'logs' && (
          <DiagnosticsView 
            logs={logs} 
            analyticsLoading={operationalEventsLoading}
            analyticsSummary={operationalAnalyticsSummary}
            isConsoleLogsClearReviewOpen={isConsoleLogsClearReviewOpen}
            openConsoleLogsClearReview={openConsoleLogsClearReview}
            cancelConsoleLogsClearReview={cancelConsoleLogsClearReview}
            confirmConsoleLogsClear={clearLogs}
            isOperationalAnalyticsClearReviewOpen={isOperationalAnalyticsClearReviewOpen}
            openOperationalAnalyticsClearReview={openOperationalAnalyticsClearReview}
            cancelOperationalAnalyticsClearReview={cancelOperationalAnalyticsClearReview}
            confirmOperationalAnalyticsClear={confirmOperationalAnalyticsClear}
            exportOperationalAnalytics={exportOperationalAnalytics}
            logDiagnosticTestEvent={logDiagnosticTestEvent}
            pingWorker={pingWorker}
          />
        )}
      </main>
      
      <footer className="px-4 py-1.5 bg-slate-950 border-t border-slate-900 flex justify-between items-center text-[9px] text-slate-500">
        <span>Vite + React 18 Extension</span>
        <span>Storage: localStorage fallback active</span>
      </footer>
    </div>
  );
}
