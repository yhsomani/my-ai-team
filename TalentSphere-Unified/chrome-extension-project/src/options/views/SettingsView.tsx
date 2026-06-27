import React from 'react';
import { CloudOff, Settings2, Clock } from 'lucide-react';

interface SettingsViewProps {
  isCloudSyncPlanOpen: boolean;
  openCloudSyncPlan: () => void;
  closeCloudSyncPlan: () => void;
  notifications: boolean;
  setNotifications: (val: boolean | ((curr: boolean) => boolean)) => Promise<void> | void;
  analytics: boolean;
  setAnalytics: (val: boolean | ((curr: boolean) => boolean)) => Promise<void> | void;
  prepCount: number;
  isPrepClearReviewOpen: boolean;
  openPrepClearReview: () => void;
  cancelPrepClearReview: () => void;
  confirmPrepClear: () => void;
}

const secondaryButtonClassName = 'rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface-muted)] px-4 py-2 text-xs font-semibold text-[var(--ext-text)] transition hover:border-[var(--ext-accent)] hover:bg-[var(--ext-accent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]';
const dangerButtonClassName = 'rounded-lg border border-[var(--ext-danger)] bg-[var(--ext-danger-muted)] px-4 py-2 text-xs font-semibold text-[var(--ext-danger)] transition hover:bg-[var(--ext-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]';

export const SettingsView: React.FC<SettingsViewProps> = ({
  isCloudSyncPlanOpen,
  openCloudSyncPlan,
  closeCloudSyncPlan,
  notifications,
  setNotifications,
  analytics,
  setAnalytics,
  prepCount,
  isPrepClearReviewOpen,
  openPrepClearReview,
  cancelPrepClearReview,
  confirmPrepClear
}) => {
  const hasPrepCards = prepCount > 0;

  return (
    <div className="max-w-xl space-y-8" id="opt-view-settings">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ext-accent)]">
          <Settings2 className="h-4 w-4" />
          <span>Local Preferences</span>
        </div>
        <h2 className="text-3xl font-extrabold text-[var(--ext-text)]">Companion Settings</h2>
        <p className="max-w-2xl text-sm text-[var(--ext-text-secondary)]">
          Configure browser-local sync status, reminder preferences, diagnostics storage, and prep-card reset controls.
        </p>
      </div>

      <div className="space-y-5 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-6">
        <div className="flex flex-col gap-3 py-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col space-y-0.5">
            <span className="text-xs font-semibold text-[var(--ext-text)]">TalentSphere Cloud Synchronization</span>
            <span className="text-[10px] text-[var(--ext-text-secondary)]">Authenticated web sync is not connected yet; extension data stays in this browser.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ext-border)] bg-[var(--ext-surface-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--ext-text-secondary)]">
              <CloudOff className="h-3 w-3" />
              Local only
            </span>
            <button
              type="button"
              onClick={openCloudSyncPlan}
              className="rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface-muted)] px-3 py-1.5 text-[10px] font-semibold text-[var(--ext-text)] transition hover:border-[var(--ext-accent)] hover:bg-[var(--ext-accent-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]"
              id="review-cloud-sync-plan"
              aria-controls="cloud-sync-plan-review"
              aria-expanded={isCloudSyncPlanOpen}
            >
              Review Plan
            </button>
          </div>
        </div>

        {isCloudSyncPlanOpen && (
          <div
            role="status"
            className="space-y-3 rounded-lg border border-[var(--ext-accent)] bg-[var(--ext-accent-muted)] p-4"
            id="cloud-sync-plan-review"
          >
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-[var(--ext-accent)]">Cloud sync is not enabled yet</h4>
              <p className="text-[10px] leading-relaxed text-[var(--ext-text-secondary)]">
                Tracked jobs, scanned drafts, prep cards, diagnostics logs, and local analytics remain browser-local. Future authenticated sync should require explicit review before importing or exporting extension records.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeCloudSyncPlan}
                className={secondaryButtonClassName}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-[var(--ext-border)] pt-4 py-1.5">
          <div className="flex flex-col space-y-0.5">
            <span className="text-xs font-semibold text-[var(--ext-text)]">Interview Reminder Preference</span>
            <span className="text-[10px] text-[var(--ext-text-secondary)]">Store a local preference for future reminder workflows. Browser notifications are not scheduled yet.</span>
          </div>
          <button
            type="button"
            onClick={() => setNotifications(curr => !curr)}
            aria-label="Toggle local interview reminder preference"
            aria-pressed={notifications}
            className={`flex h-6 w-10 cursor-pointer items-center rounded-full border p-1 transition focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] ${
              notifications ? 'border-[var(--ext-success)] bg-[var(--ext-success)]' : 'border-[var(--ext-border)] bg-[var(--ext-surface-muted)]'
            }`}
            id="toggle-notifications"
          >
            <div className={`h-4 w-4 rounded-full bg-[var(--ext-surface)] transition duration-200 ${
              notifications ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--ext-border)] pt-4 py-1.5">
          <div className="flex flex-col space-y-0.5">
            <span className="text-xs font-semibold text-[var(--ext-text)]">Store Local Usage Diagnostics</span>
            <span className="text-[10px] text-[var(--ext-text-secondary)]">Keep a bounded local diagnostics queue in this browser. Export is manual and raw content is not stored.</span>
          </div>
          <button
            type="button"
            onClick={() => setAnalytics(curr => !curr)}
            aria-label="Toggle local usage diagnostics storage"
            aria-pressed={analytics}
            className={`flex h-6 w-10 cursor-pointer items-center rounded-full border p-1 transition focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] ${
              analytics ? 'border-[var(--ext-success)] bg-[var(--ext-success)]' : 'border-[var(--ext-border)] bg-[var(--ext-surface-muted)]'
            }`}
            id="toggle-telemetry"
          >
            <div className={`h-4 w-4 rounded-full bg-[var(--ext-surface)] transition duration-200 ${
              analytics ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-5">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface-muted)] p-2">
            <Clock className="h-5 w-5 text-[var(--ext-text-muted)]" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-[var(--ext-text)]">Interview Planner Reset</h4>
            <p className="mt-0.5 break-words text-[10px] text-[var(--ext-text-muted)]">Clear locally saved prep cards after review. Tracker jobs, diagnostics, and settings stay unchanged.</p>
          </div>
        </div>
        <button
          onClick={openPrepClearReview}
          disabled={!hasPrepCards}
          className="shrink-0 rounded-lg border border-[var(--ext-danger)] bg-[var(--ext-danger-muted)] px-4 py-2 text-xs font-semibold text-[var(--ext-danger)] transition hover:bg-[var(--ext-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] disabled:cursor-not-allowed disabled:border-[var(--ext-border)] disabled:bg-[var(--ext-surface-muted)] disabled:text-[var(--ext-text-muted)]"
          id="reset-prep-cards-btn"
        >
          Clear Prep Cards
        </button>
      </div>

      {isPrepClearReviewOpen && hasPrepCards && (
        <div
          role="alert"
          className="space-y-3 rounded-lg border border-[var(--ext-warning)] bg-[var(--ext-warning-muted)] p-5"
          id="settings-prep-clear-review"
        >
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-[var(--ext-warning)]">Clear interview planner cards?</h4>
            <p className="text-[10px] leading-relaxed text-[var(--ext-text-secondary)]">
              This removes {prepCount} local prep {prepCount === 1 ? 'card' : 'cards'} from this browser. It does not clear tracked jobs, diagnostics analytics, scanned drafts, cloud-sync settings, or notification settings.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelPrepClearReview}
              className={secondaryButtonClassName}
            >
              Keep Cards
            </button>
            <button
              type="button"
              onClick={confirmPrepClear}
              className={dangerButtonClassName}
            >
              Clear Cards
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
