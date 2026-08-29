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

const secondaryButtonClassName = 'inline-flex items-center justify-center gap-1 rounded-md border border-[var(--ext-border)] bg-[var(--ext-surface-muted)] px-2 py-1 text-[10px] font-medium text-[var(--ext-text)] transition hover:border-[var(--ext-accent)] hover:bg-[var(--ext-accent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] disabled:cursor-not-allowed disabled:text-[var(--ext-text-muted)]';
const dangerButtonClassName = 'rounded-md border border-[var(--ext-danger)] bg-[var(--ext-danger-muted)] px-2 py-1 text-[10px] font-semibold text-[var(--ext-danger)] transition hover:bg-[var(--ext-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]';
const reviewPanelClassName = 'rounded-lg border border-[var(--ext-warning)] bg-[var(--ext-warning-muted)] p-2.5 space-y-2';

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
        <span className="text-xs font-semibold text-[var(--ext-text)]">Live Background Stream</span>
        <button
          type="button"
          onClick={openConsoleLogsClearReview}
          disabled={!hasConsoleLogs}
          className="text-[10px] text-[var(--ext-text-muted)] transition hover:text-[var(--ext-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] disabled:cursor-not-allowed disabled:opacity-50"
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
          className={reviewPanelClassName}
          id="clear-console-logs-review"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-[var(--ext-warning)]">Clear console logs?</p>
            <p className="text-[9px] leading-relaxed text-[var(--ext-text-secondary)]">
              This removes {logs.length} visible diagnostic {logs.length === 1 ? 'line' : 'lines'} from this popup session. Local analytics, tracker jobs, scanned drafts, prep cards, and settings stay unchanged.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelConsoleLogsClearReview}
              className={secondaryButtonClassName}
            >
              Keep Logs
            </button>
            <button
              type="button"
              onClick={confirmConsoleLogsClear}
              className={dangerButtonClassName}
            >
              Clear Logs
            </button>
          </div>
        </div>
      )}

      <section className="space-y-2 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-3" id="operational-analytics-panel">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <Database className="h-3.5 w-3.5 text-[var(--ext-accent)]" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-[var(--ext-text)]">Local Analytics</div>
              <div className="truncate text-[9px] text-[var(--ext-text-muted)]">
                {analyticsLoading ? 'Loading' : `${analyticsSummary.eventCount} events`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={exportOperationalAnalytics}
              disabled={!hasAnalyticsEvents}
              className={secondaryButtonClassName}
              id="export-operational-analytics-btn"
            >
              <Download className="h-3 w-3" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={openOperationalAnalyticsClearReview}
              disabled={!hasAnalyticsEvents}
              className={secondaryButtonClassName}
              id="clear-operational-analytics-btn"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 text-[9px] text-[var(--ext-text-muted)]">
          <span className="break-words">{analyticsSummary.lastEventLabel}</span>
          <span className="whitespace-nowrap">{lastEventTime}</span>
        </div>

        {isOperationalAnalyticsClearReviewOpen && hasAnalyticsEvents && (
          <div
            role="alert"
            className={reviewPanelClassName}
            id="clear-operational-analytics-review"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-[var(--ext-warning)]">Clear local analytics queue?</p>
              <p className="text-[9px] leading-relaxed text-[var(--ext-text-secondary)]">
                This removes {analyticsSummary.eventCount} local diagnostic {analyticsSummary.eventCount === 1 ? 'event' : 'events'} from this browser. Export first if you need a copy. Console logs, tracker jobs, scanned drafts, prep cards, and settings stay unchanged.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelOperationalAnalyticsClearReview}
                className={secondaryButtonClassName}
              >
                Keep
              </button>
              <button
                type="button"
                onClick={confirmOperationalAnalyticsClear}
                className={dangerButtonClassName}
              >
                Clear Queue
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="h-[210px] flex-1 space-y-1.5 overflow-y-auto rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-3 font-mono text-[10px]" id="diagnostics-terminal">
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-start gap-1.5">
            <span className="text-[var(--ext-text-muted)]">[{log.time}]</span>
            <span className={`font-semibold ${
              log.type === 'success' ? 'text-[var(--ext-success)]' :
              log.type === 'warn' ? 'text-[var(--ext-warning)]' :
              'text-[var(--ext-accent)]'
            }`}>
              {log.type === 'success' ? '✔ SUCCESS:' :
               log.type === 'warn' ? '⚠ WARNING:' :
               'ℹ INFO:'}
            </span>
            <span className="break-words text-[var(--ext-text-secondary)]">{log.message}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between space-x-2">
        <button
          type="button"
          onClick={logDiagnosticTestEvent}
          aria-label="Log local diagnostics test event"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] py-1.5 text-xs text-[var(--ext-text)] transition hover:border-[var(--ext-accent)] hover:bg-[var(--ext-accent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
          id="log-diagnostic-test-event-btn"
        >
          <Activity className="h-3 w-3" />
          <span>Log Test Event</span>
        </button>
        <button
          type="button"
          onClick={pingWorker}
          aria-label="Ping extension background worker"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] py-1.5 text-xs text-[var(--ext-text)] transition hover:border-[var(--ext-accent)] hover:bg-[var(--ext-accent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
          id="ping-messaging-btn"
        >
          <Wifi className="h-3 w-3" />
          <span>Ping Worker</span>
        </button>
      </div>
    </div>
  );
};
