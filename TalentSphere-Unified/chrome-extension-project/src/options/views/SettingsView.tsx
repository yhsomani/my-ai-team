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
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <Settings2 className="h-4 w-4" />
          <span>Local Preferences</span>
        </div>
        <h2 className="text-3xl font-extrabold font-outfit text-white tracking-tight">Companion Settings</h2>
        <p className="text-slate-400 text-sm max-w-2xl">
          Configure browser-local sync status, reminder preferences, diagnostics storage, and prep-card reset controls.
        </p>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between py-1.5">
          <div className="flex flex-col space-y-0.5">
            <span className="text-xs font-semibold text-white">TalentSphere Cloud Synchronization</span>
            <span className="text-[10px] text-slate-400">Authenticated web sync is not connected yet; extension data stays in this browser.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
              <CloudOff className="h-3 w-3" />
              Local only
            </span>
            <button
              type="button"
              onClick={openCloudSyncPlan}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-800"
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
            className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-3"
            id="cloud-sync-plan-review"
          >
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-cyan-200">Cloud sync is not enabled yet</h4>
              <p className="text-[10px] leading-relaxed text-cyan-100/80">
                Tracked jobs, scanned drafts, prep cards, diagnostics logs, and local analytics remain browser-local. Future authenticated sync should require explicit review before importing or exporting extension records.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeCloudSyncPlan}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-850 pt-4 py-1.5">
          <div className="flex flex-col space-y-0.5">
            <span className="text-xs font-semibold text-white">Interview Reminder Preference</span>
            <span className="text-[10px] text-slate-400">Store a local preference for future reminder workflows. Browser notifications are not scheduled yet.</span>
          </div>
          <button
            type="button"
            onClick={() => setNotifications(curr => !curr)}
            aria-label="Toggle local interview reminder preference"
            aria-pressed={notifications}
            className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
              notifications ? 'bg-emerald-600' : 'bg-slate-800'
            }`}
            id="toggle-notifications"
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
              notifications ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-slate-850 pt-4 py-1.5">
          <div className="flex flex-col space-y-0.5">
            <span className="text-xs font-semibold text-white">Store Local Usage Diagnostics</span>
            <span className="text-[10px] text-slate-400">Keep a bounded local diagnostics queue in this browser. Export is manual and raw content is not stored.</span>
          </div>
          <button
            type="button"
            onClick={() => setAnalytics(curr => !curr)}
            aria-label="Toggle local usage diagnostics storage"
            aria-pressed={analytics}
            className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
              analytics ? 'bg-emerald-600' : 'bg-slate-800'
            }`}
            id="toggle-telemetry"
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
              analytics ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      <div className="bg-slate-900/10 border border-slate-850 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-start space-x-3.5">
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
            <Clock className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Interview Planner Reset</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Clear locally saved prep cards after review. Tracker jobs, diagnostics, and settings stay unchanged.</p>
          </div>
        </div>
        <button
          onClick={openPrepClearReview}
          disabled={!hasPrepCards}
          className="bg-rose-950/40 hover:bg-rose-950/80 border border-rose-900/40 text-rose-400 text-xs font-semibold rounded-xl px-4 py-2 transition disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/30 disabled:text-slate-600"
          id="reset-prep-cards-btn"
        >
          Clear Prep Cards
        </button>
      </div>

      {isPrepClearReviewOpen && hasPrepCards && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-3"
          id="settings-prep-clear-review"
        >
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-amber-200">Clear interview planner cards?</h4>
            <p className="text-[10px] leading-relaxed text-amber-100/80">
              This removes {prepCount} local prep {prepCount === 1 ? 'card' : 'cards'} from this browser. It does not clear tracked jobs, diagnostics analytics, scanned drafts, cloud-sync settings, or notification settings.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelPrepClearReview}
              className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Keep Cards
            </button>
            <button
              type="button"
              onClick={confirmPrepClear}
              className="rounded-xl border border-rose-700/60 bg-rose-950/70 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-900/80"
            >
              Clear Cards
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
