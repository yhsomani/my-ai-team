import { Search, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

interface Job {
  id: string;
  company: string;
  role: string;
  status: 'Applied' | 'Interviewing' | 'Offered' | 'Rejected';
  date: string;
}

interface JobsViewProps {
  jobs: Job[];
  handleAddJob: (company: string, role: string, status: Job['status']) => void;
  handleDeleteJob: (id: string) => void;
  handleUpdateStatus: (id: string, newStatus: Job['status']) => void;
}

export const JobsView: React.FC<JobsViewProps> = ({ jobs, handleAddJob, handleDeleteJob, handleUpdateStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newStatus, setNewStatus] = useState<Job['status']>('Applied');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newRole) return;
    handleAddJob(newCompany, newRole, newStatus);
    setNewCompany('');
    setNewRole('');
    setNewStatus('Applied');
    setShowAddForm(false);
  };

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
          onClick={() => setShowAddForm(curr => !curr)}
          className="bg-cyan-600 hover:bg-cyan-500 shadow-neonGlow text-white p-2 rounded-lg transition"
          id="toggle-add-job-form"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

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
        {jobs.filter(j => 
          j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          j.role.toLowerCase().includes(searchTerm.toLowerCase())
        ).map((job) => (
          <div 
            key={job.id} 
            className="group bg-slate-900/30 hover:bg-slate-900/70 border border-slate-800/40 hover:border-slate-800/80 rounded-xl p-3 flex justify-between items-center transition duration-200"
          >
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-white tracking-wide">{job.role}</h4>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-400">{job.company}</span>
                <span className="text-[9px] text-slate-600">•</span>
                <span className="text-[9px] text-slate-500">{job.date}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
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
                onClick={() => handleDeleteJob(job.id)}
                className="text-slate-600 hover:text-rose-400 p-1 rounded-md transition duration-150"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
