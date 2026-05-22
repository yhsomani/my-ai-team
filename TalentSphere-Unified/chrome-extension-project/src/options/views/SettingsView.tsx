import React from 'react';
import { Settings2, Clock } from 'lucide-react';

interface SettingsViewProps {
  cloudSync: boolean;
  setCloudSync: (val: boolean | ((curr: boolean) => boolean)) => Promise<void> | void;
  notifications: boolean;
  setNotifications: (val: boolean | ((curr: boolean) => boolean)) => Promise<void> | void;
  analytics: boolean;
  setAnalytics: (val: boolean | ((curr: boolean) => boolean)) => Promise<void> | void;
  clearPrep: () => void;
}


export const SettingsView: React.FC<SettingsViewProps> = ({
  cloudSync,
  setCloudSync,
  notifications,
  setNotifications,
  analytics,
  setAnalytics,
  clearPrep
}) => {
  return (
    <div className="max-w-xl space-y-8" id="opt-view-settings">
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <Settings2 className="h-4 w-4" />
          <span>System Administration</span>
        </div>
        <h2 className="text-3xl font-extrabold font-outfit text-white tracking-tight">System Settings</h2>
        <p className="text-slate-400 text-sm max-w-2xl">
          Configure cloud syncing parameters, telemetry thresholds, and diagnostic systems.
        </p>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between py-1.5">
          <div className="flex flex-col space-y-0.5">
            <span className="text-xs font-semibold text-white">TalentSphere Cloud Synchronization</span>
            <span className="text-[10px] text-slate-400">Sync tracked applications automatically to our cloud servers.</span>
          </div>
          <button
            type="button"
            onClick={() => setCloudSync(curr => !curr)}
            className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
              cloudSync ? 'bg-emerald-600' : 'bg-slate-800'
            }`}
            id="toggle-cloud-sync"
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
              cloudSync ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-slate-850 pt-4 py-1.5">
          <div className="flex flex-col space-y-0.5">
            <span className="text-xs font-semibold text-white">Interview Notifications</span>
            <span className="text-[10px] text-slate-400">Notify me 30 minutes before active scheduled interview reviews.</span>
          </div>
          <button
            type="button"
            onClick={() => setNotifications(curr => !curr)}
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
            <span className="text-xs font-semibold text-white">Share Usage Diagnostics</span>
            <span className="text-[10px] text-slate-400">Opt-in to sharing performance telemetry data to help improve TalentSphere.</span>
          </div>
          <button
            type="button"
            onClick={() => setAnalytics(curr => !curr)}
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
            <h4 className="text-xs font-semibold text-white">Local Diagnostic Reset</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Clear all active Chrome and localStorage data indices instantly.</p>
          </div>
        </div>
        <button
          onClick={clearPrep}
          className="bg-rose-950/40 hover:bg-rose-950/80 border border-rose-900/40 text-rose-400 text-xs font-semibold rounded-xl px-4 py-2 transition"
          id="reset-diagnostics-btn"
        >
          Clear Database
        </button>
      </div>
    </div>
  );
};
