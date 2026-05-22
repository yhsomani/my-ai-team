import { useState, useMemo, useCallback } from 'react';
import { Briefcase, BarChart3, Terminal, ExternalLink } from 'lucide-react';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { extMessaging } from '../lib/messaging';

import { DashboardView } from './views/DashboardView';
import { JobsView } from './views/JobsView';
import { DiagnosticsView } from './views/DiagnosticsView';

interface Job {
  id: string;
  company: string;
  role: string;
  status: 'Applied' | 'Interviewing' | 'Offered' | 'Rejected';
  date: string;
}

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'warn';
  message: string;
}

export function PopupApp() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'jobs' | 'logs'>('dashboard');
  const [jobs, setJobs] = useChromeStorage<Job[]>('ts_jobs', [
    { id: '1', company: 'Google', role: 'Frontend Engineer', status: 'Interviewing', date: '2026-05-20' },
    { id: '2', company: 'Stripe', role: 'Full Stack Engineer', status: 'Applied', date: '2026-05-21' },
    { id: '3', company: 'Netflix', role: 'Backend Specialist', status: 'Offered', date: '2026-05-18' }
  ]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: '21:08:12', type: 'info', message: 'TalentSphere Companion initialized.' },
    { time: '21:08:13', type: 'success', message: 'Successfully connected to Local Storage API.' }
  ]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setLogs(curr => [{ time: timeStr, type, message }, ...curr]);
  }, []);

  const handleAddJob = useCallback(async (newCompany: string, newRole: string, newStatus: Job['status']) => {
    const newJob: Job = {
      id: Date.now().toString(),
      company: newCompany,
      role: newRole,
      status: newStatus,
      date: new Date().toISOString().split('T')[0]
    };

    await setJobs(curr => [...curr, newJob]);
    addLog(`Tracked new application: ${newRole} at ${newCompany}.`, 'success');
  }, [setJobs, addLog]);

  const handleDeleteJob = useCallback(async (id: string) => {
    const jobToDelete = jobs.find(j => j.id === id);
    await setJobs(curr => curr.filter(j => j.id !== id));
    if (jobToDelete) {
      addLog(`Removed application: ${jobToDelete.role} at ${jobToDelete.company}.`, 'info');
    }
  }, [jobs, setJobs, addLog]);

  const handleUpdateStatus = useCallback(async (id: string, newStatus: Job['status']) => {
    await setJobs(curr => curr.map(j => j.id === id ? { ...j, status: newStatus } : j));
    const updatedJob = jobs.find(j => j.id === id);
    if (updatedJob) {
      addLog(`Updated status of ${updatedJob.role} at ${updatedJob.company} to "${newStatus}".`, 'success');
    }
  }, [jobs, setJobs, addLog]);

  const triggerMockAnalysis = useCallback(async () => {
    addLog('Requesting active tab DOM parsing from background service worker...', 'info');
    const response = await extMessaging.sendMessage({ action: 'analyze_page' });
    if (response && response.status === 'success') {
      addLog(`Received tab analysis: "${response.summary}"`, 'success');
    }
  }, [addLog]);

  const openOptionsPage = useCallback(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('../options/index.html', '_blank');
    }
  }, []);

  const pingWorker = useCallback(async () => {
    addLog('Testing messaging connectivity to extension options thread...', 'info');
    const resp = await extMessaging.sendMessage({ action: 'ping' });
    addLog(`Received connection ping reply: ${JSON.stringify(resp)}`, 'success');
  }, [addLog]);

  const statusCounts = useMemo(() => ({
    Applied: jobs.filter(j => j.status === 'Applied').length,
    Interviewing: jobs.filter(j => j.status === 'Interviewing').length,
    Offered: jobs.filter(j => j.status === 'Offered').length,
    Rejected: jobs.filter(j => j.status === 'Rejected').length,
  }), [jobs]);

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
          onClick={() => setActiveTab('dashboard')}
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
          onClick={() => setActiveTab('jobs')}
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
          onClick={() => setActiveTab('logs')}
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
            triggerMockAnalysis={triggerMockAnalysis} 
          />
        )}
        
        {activeTab === 'jobs' && (
          <JobsView 
            jobs={jobs} 
            handleAddJob={handleAddJob} 
            handleDeleteJob={handleDeleteJob} 
            handleUpdateStatus={handleUpdateStatus} 
          />
        )}

        {activeTab === 'logs' && (
          <DiagnosticsView 
            logs={logs} 
            setLogs={setLogs} 
            addLog={addLog} 
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
