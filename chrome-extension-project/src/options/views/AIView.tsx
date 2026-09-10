import React, { useState } from 'react';
import { Compass, FileText, Cpu, RefreshCw, Sparkles, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import {
  getResumeMatchInputStatus,
  getResumeMatchProgressStatus,
  type ResumeMatchStatusCopy
} from '../../lib/resumeMatchStatus';

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

const panelClassName = 'rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-5';
const textareaClassName = 'h-64 w-full resize-none rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface-inset)] p-4 font-mono text-xs text-[var(--ext-text)] transition focus:border-[var(--ext-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)]';

const getStatusPanelClassName = (status: ResumeMatchStatusCopy) => {
  if (status.tone === 'warning') {
    return 'border-[var(--ext-warning)] bg-[var(--ext-warning-muted)]';
  }

  if (status.tone === 'success') {
    return 'border-[var(--ext-success)] bg-[var(--ext-success-muted)]';
  }

  return 'border-[var(--ext-border)] bg-[var(--ext-surface-muted)]';
};

const getStatusTextClassName = (status: ResumeMatchStatusCopy) => {
  if (status.tone === 'warning') {
    return 'text-[var(--ext-warning)]';
  }

  if (status.tone === 'success') {
    return 'text-[var(--ext-success)]';
  }

  return 'text-[var(--ext-accent)]';
};

const formatCharacterCount = (value: string) => `${value.trim().length.toLocaleString()} characters`;

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
  const [hasFieldValidationAttempt, setHasFieldValidationAttempt] = useState(false);
  const matchedKeywords = matchReport?.matchedKeywords.slice(0, 6) ?? [];
  const missingKeywords = matchReport?.missingKeywords.slice(0, 6) ?? [];
  const improvementTips = matchReport?.improvementTips.slice(0, 3) ?? [];
  const inputStatus = getResumeMatchInputStatus({
    jobDescription,
    resumeText,
    hasSubmitted: hasFieldValidationAttempt
  });
  const progressStatus = getResumeMatchProgressStatus({ optimizing, optimized });
  const activeStatus = inputStatus ?? progressStatus;
  const StatusIcon = activeStatus?.tone === 'success'
    ? CheckCircle
    : activeStatus?.tone === 'warning'
      ? AlertTriangle
      : Cpu;
  const jobDescriptionMissing = hasFieldValidationAttempt && jobDescription.trim().length === 0;
  const resumeTextMissing = hasFieldValidationAttempt && resumeText.trim().length === 0;
  const jobDescriptionDescribedBy = [
    'job-desc-helper',
    inputStatus ? 'resume-match-input-status' : ''
  ].filter(Boolean).join(' ');
  const resumeTextDescribedBy = [
    'resume-text-helper',
    inputStatus ? 'resume-match-input-status' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className="max-w-4xl space-y-8" id="opt-view-ai">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ext-accent)]">
          <Sparkles className="h-4 w-4" />
          <span>Local Review Tool</span>
        </div>
        <h2 className="text-3xl font-extrabold text-[var(--ext-text)]">Resume Match Preview</h2>
        <p className="max-w-2xl text-sm text-[var(--ext-text-secondary)]">
          Compare pasted resume text with a target job description using local keyword overlap. Review the suggestions before changing your resume.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          setHasFieldValidationAttempt(true);
          handleOptimize(event);
        }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        aria-describedby={activeStatus ? 'resume-match-input-status' : undefined}
      >
        <div className={`${panelClassName} space-y-3`}>
          <label htmlFor="job-desc-textarea" className="flex items-center gap-2 text-[var(--ext-text)]">
            <Compass className="h-4 w-4 text-[var(--ext-accent)]" />
            <span className="text-xs font-semibold">Target Job Description</span>
          </label>
          <textarea
            placeholder="Paste the job description from the portal here."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            onInvalid={() => setHasFieldValidationAttempt(true)}
            className={textareaClassName}
            required
            id="job-desc-textarea"
            aria-describedby={jobDescriptionDescribedBy}
            aria-invalid={jobDescriptionMissing}
          />
          <div id="job-desc-helper" className="flex items-center justify-between gap-3 text-[10px] text-[var(--ext-text-muted)]">
            <span>Target text</span>
            <span>{formatCharacterCount(jobDescription)}</span>
          </div>
        </div>

        <div className={`${panelClassName} space-y-3`}>
          <label htmlFor="resume-textarea" className="flex items-center gap-2 text-[var(--ext-text)]">
            <FileText className="h-4 w-4 text-[var(--ext-accent)]" />
            <span className="text-xs font-semibold">Your Resume</span>
          </label>
          <textarea
            placeholder="Paste your resume markdown or plain text."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            onInvalid={() => setHasFieldValidationAttempt(true)}
            className={textareaClassName}
            required
            id="resume-textarea"
            aria-describedby={resumeTextDescribedBy}
            aria-invalid={resumeTextMissing}
          />
          <div id="resume-text-helper" className="flex items-center justify-between gap-3 text-[10px] text-[var(--ext-text-muted)]">
            <span>Resume text</span>
            <span>{formatCharacterCount(resumeText)}</span>
          </div>
        </div>

        {activeStatus && (
          <div
            id="resume-match-input-status"
            role={activeStatus.tone === 'warning' ? 'alert' : 'status'}
            aria-live="polite"
            className={`lg:col-span-2 flex items-start gap-3 rounded-lg border p-3.5 ${getStatusPanelClassName(activeStatus)}`}
          >
            <StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${getStatusTextClassName(activeStatus)}`} />
            <div className="space-y-1">
              <p className={`text-xs font-semibold ${getStatusTextClassName(activeStatus)}`}>{activeStatus.title}</p>
              <p className="text-xs leading-relaxed text-[var(--ext-text-secondary)]">{activeStatus.message}</p>
            </div>
          </div>
        )}

        <div className="lg:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={optimizing}
            aria-describedby={activeStatus ? 'resume-match-input-status' : undefined}
            className="flex items-center gap-2 rounded-lg border border-[var(--ext-accent)] bg-[var(--ext-accent)] px-8 py-3.5 text-sm font-semibold text-[var(--ext-on-accent)] transition duration-200 hover:bg-[var(--ext-accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--ext-focus)] disabled:cursor-not-allowed disabled:border-[var(--ext-border)] disabled:bg-[var(--ext-surface-muted)] disabled:text-[var(--ext-text-muted)]"
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
        <div
          className="space-y-6 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface)] p-6 transition-all duration-300"
          id="ai-results-panel"
          role="region"
          aria-labelledby="alignment-report-title"
          aria-busy={optimizing}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span id="alignment-report-title" className="text-sm font-bold text-[var(--ext-text)]">Alignment Report</span>
              {optimizing ? (
                <span className="animate-pulse text-xs text-[var(--ext-text-muted)]" role="status" aria-live="polite">Computing local keyword overlap...</span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-[var(--ext-success)]" role="status" aria-live="polite">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Local Preview Ready</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface-muted)] px-4 py-2">
              <span className="text-xs text-[var(--ext-text-secondary)]">Keyword coverage</span>
              <span className={`text-xl font-bold ${optimized ? 'text-[var(--ext-accent)]' : 'text-[var(--ext-text-muted)]'}`}>
                {optimized ? `${score}%` : '--'}
              </span>
            </div>
          </div>

          {optimized && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
              <div className="space-y-2 rounded-lg border border-[var(--ext-danger)] bg-[var(--ext-danger-muted)] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ext-danger)]">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Missing Job Keywords</span>
                </div>
                <ul className="space-y-1.5 break-words pl-4 text-[11px] text-[var(--ext-text-secondary)] list-disc">
                  {missingKeywords.length > 0 ? (
                    missingKeywords.map(keyword => <li key={keyword}>{keyword}</li>)
                  ) : (
                    <li>No high-signal missing keywords found in this local preview.</li>
                  )}
                </ul>
              </div>

              <div className="space-y-2 rounded-lg border border-[var(--ext-border)] bg-[var(--ext-surface-muted)] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ext-accent)]">
                  <Lightbulb className="h-4 w-4" />
                  <span>Editing Suggestions</span>
                </div>
                <ul className="space-y-1.5 break-words pl-4 text-[11px] text-[var(--ext-text-secondary)] list-disc">
                  {improvementTips.map(tip => <li key={tip}>{tip}</li>)}
                </ul>
              </div>

              <div className="space-y-2 rounded-lg border border-[var(--ext-accent)] bg-[var(--ext-accent-muted)] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ext-accent)]">
                  <Cpu className="h-4 w-4" />
                  <span>Local Metrics</span>
                </div>
                <div className="space-y-2 text-[10px] text-[var(--ext-text-secondary)]">
                  <div className="flex justify-between">
                    <span>Matched terms:</span>
                    <span className="font-semibold">{matchReport?.matchedKeywordCount ?? 0}/{matchReport?.jobKeywordCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resume signals:</span>
                    <span className="font-semibold text-[var(--ext-accent)]">{matchReport?.resumeKeywordCount ?? 0}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[var(--ext-text-muted)]">Matched keywords:</span>
                    <div className="flex flex-wrap gap-1">
                      {matchedKeywords.length > 0 ? (
                        matchedKeywords.map(keyword => (
                          <span key={keyword} className="rounded-md border border-[var(--ext-accent)] bg-[var(--ext-surface)] px-1.5 py-0.5 text-[9px] text-[var(--ext-accent)]">
                            {keyword}
                          </span>
                        ))
                      ) : (
                        <span className="text-[var(--ext-text-muted)]">No overlap found.</span>
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
