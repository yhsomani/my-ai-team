import React from 'react';
import { Activity, Database, Download, Trash2, Wifi } from 'lucide-react';

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'warn';
  message: string;
}

interface AnalyticsSummary {
  eventCount: number;
  lastEventLabel: string;
  lastOccurredAt: string;
}

interface DiagnosticsViewProps {
  logs: LogEntry[];
  analyticsLoading: boolean;
  analyticsSummary: AnalyticsSummary;
  isConsoleLogsClearReviewOpen: boolean;
  openConsoleLogsClearReview: () => void;
  cancelConsoleLogsClearReview: () => void;
  confirmConsoleLogsClear: () => void;
  isOperationalAnalyticsClearReviewOpen: boolean;
  openOperationalAnalyticsClearReview: () => void;
  cancelOperationalAnalyticsClearReview: () => void;
  confirmOperationalAnalyticsClear: () => void;
  exportOperationalAnalytics: () => void;
  logDiagnosticTestEvent: () => void;
  pingWorker: () => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  logs,
  analyticsLoading,
  analyticsSummary,
  isConsoleLogsClearReviewOpen,
  openConsoleLogsClearReview,
  cancelConsoleLogsClearReview,
  confirmConsoleLogsClear,
  isOperationalAnalyticsClearReviewOpen,
  openOperationalAnalyticsClearReview,
  cancelOperationalAnalyticsClearReview,
  confirmOperationalAnalyticsClear,
  exportOperationalAnalytics,
  logDiagnosticTestEvent,
  pingWorker
}) => {
  const hasAnalyticsEvents = analyticsSummary.eventCount > 0;
  const hasConsoleLogs = logs.length > 0;
  const lastEventTime = analyticsSummary.lastOccurredAt
    ? new Date(analyticsSummary.lastOccurredAt).toLocaleTimeString()
    : 'None';

  return (
    <div className="space-y-3 flex flex-col h-full" id="view-diagnostics">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-300">Live Background Stream</span>
        <button
          type="button"
          onClick={openConsoleLogsClearReview}
          disabled={!hasConsoleLogs}
          className="text-[10px] text-slate-500 transition hover:text-slate-300 disabled:cursor-not-allowed disabled:text-slate-700"
          id="clear-logs-btn"
          aria-controls="clear-console-logs-review"
          aria-expanded={isConsoleLogsClearReviewOpen}
        >
          Clear Console
        </button>
      </div>

      {isConsoleLogsClearReviewOpen && hasConsoleLogs && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 space-y-2"
          id="clear-console-logs-review"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-amber-200">Clear console logs?</p>
            <p className="text-[9px] leading-relaxed text-amber-100/80">
              This removes {logs.length} visible diagnostic {logs.length === 1 ? 'line' : 'lines'} from this popup session. Local analytics, tracker jobs, scanned drafts, prep cards, and settings stay unchanged.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelConsoleLogsClearReview}
              className="rounded-md border border-slate-700 bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
            >
              Keep Logs
            </button>
            <button
              type="button"
              onClick={confirmConsoleLogsClear}
              className="rounded-md border border-rose-700/60 bg-rose-950/70 px-2 py-1 text-[10px] font-semibold text-rose-200 hover:bg-rose-900/80"
            >
              Clear Logs
            </button>
          </div>
        </div>
      )}

      <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-3 space-y-2" id="operational-analytics-panel">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-200">Local Analytics</div>
              <div className="text-[9px] text-slate-500 truncate">
                {analyticsLoading ? 'Loading' : `${analyticsSummary.eventCount} events`}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={exportOperationalAnalytics}
              disabled={!hasAnalyticsEvents}
              className="inline-flex items-center space-x-1 rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-850 disabled:text-slate-600"
              id="export-operational-analytics-btn"
            >
              <Download className="h-3 w-3" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={openOperationalAnalyticsClearReview}
              disabled={!hasAnalyticsEvents}
              className="inline-flex items-center space-x-1 rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-850 disabled:text-slate-600"
              id="clear-operational-analytics-btn"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 text-[9px] text-slate-500">
          <span className="truncate">{analyticsSummary.lastEventLabel}</span>
          <span>{lastEventTime}</span>
        </div>

        {isOperationalAnalyticsClearReviewOpen && hasAnalyticsEvents && (
          <div
            role="alert"
            className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 space-y-2"
            id="clear-operational-analytics-review"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-amber-200">Clear local analytics queue?</p>
              <p className="text-[9px] leading-relaxed text-amber-100/80">
                This removes {analyticsSummary.eventCount} local diagnostic {analyticsSummary.eventCount === 1 ? 'event' : 'events'} from this browser. Export first if you need a copy. Console logs, tracker jobs, scanned drafts, prep cards, and settings stay unchanged.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelOperationalAnalyticsClearReview}
                className="rounded-md border border-slate-700 bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={confirmOperationalAnalyticsClear}
                className="rounded-md border border-rose-700/60 bg-rose-950/70 px-2 py-1 text-[10px] font-semibold text-rose-200 hover:bg-rose-900/80"
              >
                Clear Queue
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="flex-1 bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 font-mono text-[10px] space-y-1.5 h-[210px] overflow-y-auto" id="diagnostics-terminal">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-start space-x-1.5">
            <span className="text-slate-600">[{log.time}]</span>
            <span className={`font-semibold ${
              log.type === 'success' ? 'text-emerald-400' :
              log.type === 'warn' ? 'text-amber-400' :
              'text-cyan-400'
            }`}>
              {log.type === 'success' ? '✔ SUCCESS:' :
               log.type === 'warn' ? '⚠ WARNING:' :
               'ℹ INFO:'}
            </span>
            <span className="text-slate-300">{log.message}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between space-x-2">
        <button
          type="button"
          onClick={logDiagnosticTestEvent}
          aria-label="Log local diagnostics test event"
          className="flex-1 inline-flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 text-xs py-1.5 rounded-lg transition"
          id="log-diagnostic-test-event-btn"
        >
          <Activity className="h-3 w-3" />
          <span>Log Test Event</span>
        </button>
        <button
          type="button"
          onClick={pingWorker}
          aria-label="Ping extension background worker"
          className="flex-1 inline-flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 text-xs py-1.5 rounded-lg transition"
          id="ping-messaging-btn"
        >
          <Wifi className="h-3 w-3" />
          <span>Ping Worker</span>
        </button>
      </div>
    </div>
  );
};
