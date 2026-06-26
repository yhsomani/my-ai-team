import React from 'react';
import { Compass, FileText, Cpu, RefreshCw, Sparkles, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';

export interface ResumeMatchReport {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  improvementTips: string[];
  jobKeywordCount: number;
  resumeKeywordCount: number;
  matchedKeywordCount: number;
}

interface AIViewProps {
  jobDescription: string;
  setJobDescription: (val: string) => void;
  resumeText: string;
  setResumeText: (val: string) => void;
  optimizing: boolean;
  optimized: boolean;
  score: number;
  matchReport: ResumeMatchReport | null;
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
  matchReport,
  handleOptimize
}) => {
  const matchedKeywords = matchReport?.matchedKeywords.slice(0, 6) ?? [];
  const missingKeywords = matchReport?.missingKeywords.slice(0, 6) ?? [];
  const improvementTips = matchReport?.improvementTips.slice(0, 3) ?? [];

  return (
    <div className="max-w-4xl space-y-8" id="opt-view-ai">
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="h-4 w-4" />
          <span>Local Review Tool</span>
        </div>
        <h2 className="text-3xl font-extrabold font-outfit text-white tracking-tight">Resume Match Preview</h2>
        <p className="text-slate-400 text-sm max-w-2xl">
          Compare pasted resume text with a target job description using local keyword overlap. Review the suggestions before changing your resume.
        </p>
      </div>

      <form onSubmit={handleOptimize} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-xl backdrop-blur-sm">
          <div className="flex items-center space-x-2 text-slate-300">
            <Compass className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-semibold tracking-wide uppercase">Target Job Description</span>
          </div>
          <textarea
            placeholder="Paste the job description from the portal here."
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
            placeholder="Paste your resume markdown or plain text."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="w-full h-64 bg-slate-950/80 border border-slate-850 rounded-xl p-4 text-xs text-slate-200 focus:outline-none focus:border-purple-500/80 resize-none font-mono"
            required
            id="resume-textarea"
          />
        </div>

        <div className="lg:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={optimizing}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold text-sm rounded-xl px-8 py-3.5 shadow-lg transition duration-200 flex items-center space-x-2"
            id="start-optimization-btn"
          >
            {optimizing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Comparing Text...</span>
              </>
            ) : (
              <>
                <Cpu className="h-4 w-4" />
                <span>Preview Match</span>
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
                <span className="text-xs text-slate-500 animate-pulse">Computing local keyword overlap...</span>
              ) : (
                <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Local Preview Ready</span>
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3 bg-slate-950/60 border border-slate-850 px-4 py-2 rounded-xl">
              <span className="text-xs text-slate-400">Keyword coverage</span>
              <span className={`text-xl font-bold font-outfit ${optimized ? 'text-cyan-400' : 'text-slate-500'}`}>
                {optimized ? `${score}%` : '--'}
              </span>
            </div>
          </div>

          {optimized && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4.5 space-y-2">
                <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Missing Job Keywords</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4">
                  {missingKeywords.length > 0 ? (
                    missingKeywords.map(keyword => <li key={keyword}>{keyword}</li>)
                  ) : (
                    <li>No high-signal missing keywords found in this local preview.</li>
                  )}
                </ul>
              </div>

              <div className="bg-purple-950/20 border border-purple-900/40 rounded-xl p-4.5 space-y-2">
                <div className="flex items-center space-x-2 text-purple-400 font-semibold text-xs">
                  <Lightbulb className="h-4 w-4" />
                  <span>Editing Suggestions</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-4">
                  {improvementTips.map(tip => <li key={tip}>{tip}</li>)}
                </ul>
              </div>

              <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-4.5 space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs">
                  <Cpu className="h-4 w-4" />
                  <span>Local Metrics</span>
                </div>
                <div className="space-y-2 text-[10px] text-slate-300">
                  <div className="flex justify-between">
                    <span>Matched terms:</span>
                    <span className="font-semibold">{matchReport?.matchedKeywordCount ?? 0}/{matchReport?.jobKeywordCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resume signals:</span>
                    <span className="font-semibold text-cyan-400">{matchReport?.resumeKeywordCount ?? 0}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-slate-500">Matched keywords:</span>
                    <div className="flex flex-wrap gap-1">
                      {matchedKeywords.length > 0 ? (
                        matchedKeywords.map(keyword => (
                          <span key={keyword} className="rounded-md border border-cyan-900/60 bg-cyan-950/30 px-1.5 py-0.5 text-[9px] text-cyan-200">
                            {keyword}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">No overlap found.</span>
                      )}
                    </div>
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
