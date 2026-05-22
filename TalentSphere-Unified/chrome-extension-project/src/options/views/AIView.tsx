import React from 'react';
import { Compass, FileText, Cpu, RefreshCw, Sparkles, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';

interface AIViewProps {
  jobDescription: string;
  setJobDescription: (val: string) => void;
  resumeText: string;
  setResumeText: (val: string) => void;
  optimizing: boolean;
  optimized: boolean;
  score: number;
  handleOptimize: (e: React.FormEvent) => void;
}

export const AIView: React.FC<AIViewProps> = ({
  jobDescription,
  setJobDescription,
  resumeText,
  setResumeText,
  optimizing,
  optimized,
  score,
  handleOptimize
}) => {
  return (
    <div className="max-w-4xl space-y-8" id="opt-view-ai">
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="h-4 w-4" />
          <span>Next-Gen Co-pilot</span>
        </div>
        <h2 className="text-3xl font-extrabold font-outfit text-white tracking-tight">AI Resume Optimizer</h2>
        <p className="text-slate-400 text-sm max-w-2xl">
          Align your professional accomplishments with targeted job profiles to clear automated screening algorithms with ease.
        </p>
      </div>

      <form onSubmit={handleOptimize} className="grid grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-xl backdrop-blur-sm">
          <div className="flex items-center space-x-2 text-slate-300">
            <Compass className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-semibold tracking-wide uppercase">Target Job Description</span>
          </div>
          <textarea
            placeholder="Paste the job description from the portal here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full h-64 bg-slate-950/80 border border-slate-850 rounded-xl p-4 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/80 resize-none font-mono"
            required
            id="job-desc-textarea"
          />
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-xl backdrop-blur-sm">
          <div className="flex items-center space-x-2 text-slate-300">
            <FileText className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold tracking-wide uppercase">Your Resume</span>
          </div>
          <textarea
            placeholder="Paste your resume markdown or plain text credentials..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="w-full h-64 bg-slate-950/80 border border-slate-850 rounded-xl p-4 text-xs text-slate-200 focus:outline-none focus:border-purple-500/80 resize-none font-mono"
            required
            id="resume-textarea"
          />
        </div>

        <div className="col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={optimizing}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold text-sm rounded-xl px-8 py-3.5 shadow-lg transition duration-200 flex items-center space-x-2"
            id="start-optimization-btn"
          >
            {optimizing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Processing Alignment...</span>
              </>
            ) : (
              <>
                <Cpu className="h-4 w-4" />
                <span>Analyze Profile Match</span>
              </>
            )}
          </button>
        </div>
      </form>

      {(optimizing || optimized) && (
        <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-6 space-y-6 shadow-2xl transition-all duration-300" id="ai-results-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-bold font-outfit text-white uppercase tracking-wider">Alignment Report</span>
              {optimizing ? (
                <span className="text-xs text-slate-500 animate-pulse">Running advanced text embeddings...</span>
              ) : (
                <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Completed Successfully</span>
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3 bg-slate-950/60 border border-slate-850 px-4 py-2 rounded-xl">
              <span className="text-xs text-slate-400">Match score</span>
              <span className={`text-xl font-bold font-outfit ${optimized ? 'text-cyan-400' : 'text-slate-500'}`}>
                {score}%
              </span>
            </div>
          </div>

          {optimized && (
            <div className="grid grid-cols-3 gap-6 animate-fadeIn">
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4.5 space-y-2">
                <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Critical Skill Gaps</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4">
                  <li>Missing direct references to **Spring Security configurations**.</li>
                  <li>Tailwind CSS responsiveness keyword not detected.</li>
                  <li>Missing active CI/CD pipeline deployments descriptor.</li>
                </ul>
              </div>

              <div className="bg-purple-950/20 border border-purple-900/40 rounded-xl p-4.5 space-y-2">
                <div className="flex items-center space-x-2 text-purple-400 font-semibold text-xs">
                  <Lightbulb className="h-4 w-4" />
                  <span>Bullet Optimizations</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4">
                  <li>Quantify your Java backend work: e.g., "reduced latency by 35% using caching".</li>
                  <li>Upgrade verbs: Replace "helped design" with "Spearheaded design orchestration".</li>
                </ul>
              </div>

              <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-4.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs">
                  <Cpu className="h-4 w-4" />
                  <span>Relevance Metrics</span>
                </div>
                <div className="space-y-2 text-[10px] text-slate-300">
                  <div className="flex justify-between">
                    <span>Keyword Density:</span>
                    <span className="font-semibold">Good (85%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Action Verbs:</span>
                    <span className="font-semibold text-amber-400">Needs Work (55%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Semantic Alignment:</span>
                    <span className="font-semibold text-cyan-400">Excellent (92%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
