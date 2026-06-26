import { Sparkles, Clock, CheckCircle2, FileText, ScanSearch } from 'lucide-react';
import React from 'react';

import type { Job } from '../../lib/jobTypes';

interface DashboardViewProps {
  jobs: Job[];
  statusCounts: { Applied: number; Interviewing: number; Offered: number; Rejected: number };
  openOptionsPage: () => void;
  triggerPageScan: () => void;
  isScanningPage: boolean;
  hasDraft: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  jobs,
  statusCounts,
  openOptionsPage,
  triggerPageScan,
  isScanningPage,
  hasDraft
}) => {
  return (
    <div className="space-y-4" id="view-dashboard">
      <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-800/60 rounded-xl p-4 shadow-xl backdrop-blur-glass">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tracked Jobs</span>
          <Sparkles className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold font-outfit text-white tracking-tight">{jobs.length}</span>
          <span className="text-xs text-slate-500">local tracker records</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span className="text-[11px] font-medium text-slate-400">Interviewing</span>
          </div>
          <span className="text-xl font-semibold mt-1 text-white">{statusCounts.Interviewing}</span>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-3 flex flex-col justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-[11px] font-medium text-slate-400">Offered</span>
          </div>
          <span className="text-xl font-semibold mt-1 text-white">{statusCounts.Offered}</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-950/30 to-blue-950/20 border border-purple-900/40 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-start space-x-3">
          <div className="bg-purple-900/40 border border-purple-800/50 p-2 rounded-lg mt-0.5">
            <FileText className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Resume Match Preview</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">Compare pasted job and resume text locally in the options panel.</p>
          </div>
        </div>
        <button 
          onClick={openOptionsPage}
          className="bg-purple-600 hover:bg-purple-500 shadow-purpleGlow text-white text-xs font-medium rounded-lg px-2.5 py-1.5 transition duration-200"
        >
          Launch
        </button>
      </div>

      <div className="border border-slate-800/60 rounded-xl p-3 bg-slate-900/10 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-300 font-semibold">Page Scan Draft</span>
          <span className="text-[9px] text-slate-500 mt-0.5">
            {hasDraft ? 'Editable draft ready in Tracker.' : 'Create an editable local draft from the current page.'}
          </span>
        </div>
        <button
          onClick={triggerPageScan}
          disabled={isScanningPage}
          className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-500 text-xs font-medium text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 transition duration-200"
          id="tab-analyze-btn"
        >
          <ScanSearch className="h-3.5 w-3.5" />
          <span>{isScanningPage ? 'Scanning' : 'Scan Webpage'}</span>
        </button>
      </div>
    </div>
  );
};
