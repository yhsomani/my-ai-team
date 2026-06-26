import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CheckCircle2, Clock, Code2, FileText, Play, RefreshCw, RotateCcw, Send, Trophy, Users, XCircle } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchChallenges, selectAllChallenges } from '../../store/slices/challengeSlice';
import { EmptyState } from '../../components/shared/EmptyState';
import { Skeleton } from '../../components/shared/Skeleton';
import { useToast } from '../../components/shared/Toast';
import { AuraModal } from '../../components/shared/AuraModal';
import { challengeService } from '../../services/challengeService';
import { Challenge, ChallengeSubmission, ChallengeTestCase } from '../../types/challenges';
import {
  recordChallengeWorkflowAnalytics,
  type ChallengeWorkflowAnalyticsAction,
} from '../../lib/challengeWorkflowAnalytics';

const LANGUAGES = ['javascript', 'python', 'java', 'typescript'];
const LOCAL_CHECK_SUPPORTED_LANGUAGES = new Set(['javascript', 'typescript']);
const LOCAL_CHECK_TIMEOUT_MS = 1500;

type LocalCheckStatus = 'passed' | 'failed' | 'error';
type LocalCheckResult = {
  id: string;
  label: string;
  input: string;
  expected: string;
  actual?: string;
  status: LocalCheckStatus;
  detail?: string;
};

type LocalRunnerResult = {
  actual?: string;
  error?: string;
};

const getDifficultyVariant = (difficulty?: string) => {
  const normalized = (difficulty || '').toLowerCase();
  if (normalized.includes('hard') || normalized.includes('extreme') || normalized === 'high') return 'destructive';
  if (normalized.includes('medium')) return 'warning';
  return 'success';
};

const getStarterCode = (challenge: Challenge) => {
  return challenge.starterCode || challenge.starter_code || [
    '// Write your solution here',
    'function solve(input) {',
    '  return input;',
    '}',
    '',
    'console.log(solve(require("fs").readFileSync(0, "utf8").trim()));',
  ].join('\n');
};

const getTestCases = (challenge: Challenge): ChallengeTestCase[] => {
  return challenge.testCases || challenge.test_cases || [];
};

const getTestCaseInput = (testCase: ChallengeTestCase) => testCase.input || testCase.test_case || '';
const getTestCaseExpectedOutput = (testCase: ChallengeTestCase) => testCase.expectedOutput || testCase.expected_output || '';
const getRunnableSampleCases = (challenge: Challenge) => getTestCases(challenge).filter((testCase) =>
  Boolean(getTestCaseInput(testCase).trim()) && Boolean(getTestCaseExpectedOutput(testCase).trim())
);

const normalizeSampleOutput = (value?: string) => (value || '').replace(/\r\n/g, '\n').trim();

const stripNodeStdinInvocation = (code: string) => code.replace(
  /console\.log\s*\(\s*solve\s*\(\s*require\s*\(\s*['"]fs['"]\s*\)\.readFileSync\s*\(\s*0\s*,\s*['"]utf8['"]\s*\)\.trim\s*\(\s*\)\s*\)\s*\)\s*;?/g,
  ''
);

const getLocalCheckStatusVariant = (status: LocalCheckStatus) => {
  if (status === 'passed') return 'success';
  if (status === 'failed') return 'destructive';
  return 'warning';
};

const runLocalSampleCase = (code: string, input: string): Promise<LocalRunnerResult> => new Promise((resolve) => {
  if (typeof Worker === 'undefined') {
    resolve({ error: 'Local browser workers are unavailable.' });
    return;
  }

  const workerScript = `
    const formatValue = (value) => {
      if (value === undefined || value === null) return '';
      if (typeof value === 'string') return value;
      try {
        return JSON.stringify(value);
      } catch (error) {
        return String(value);
      }
    };

    self.onmessage = async (event) => {
      const { code, input } = event.data;
      const capturedLogs = [];
      const localConsole = {
        log: (...items) => capturedLogs.push(items.map(formatValue).join(' ')),
        error: (...items) => capturedLogs.push(items.map(formatValue).join(' ')),
        warn: (...items) => capturedLogs.push(items.map(formatValue).join(' '))
      };
      const module = { exports: {} };
      const exports = module.exports;
      const blockedRequire = () => {
        throw new Error('Node modules are unavailable in local sample check.');
      };
      const process = { argv: [], env: {} };

      try {
        const runner = new Function('input', 'console', 'module', 'exports', 'require', 'process', 'capturedLogs', \`
          "use strict";
          const window = undefined;
          const document = undefined;
          const self = undefined;
          const fetch = undefined;
          const XMLHttpRequest = undefined;
          const WebSocket = undefined;
          const importScripts = undefined;
          \${code}
          if (typeof solve === "function") return solve(input);
          if (module.exports && typeof module.exports.solve === "function") return module.exports.solve(input);
          if (typeof module.exports === "function") return module.exports(input);
          return capturedLogs.join("\\\\n");
        \`);

        const result = await Promise.resolve(runner(input, localConsole, module, exports, blockedRequire, process, capturedLogs));
        self.postMessage({ actual: formatValue(result) });
      } catch (error) {
        self.postMessage({ error: error && error.message ? error.message : String(error) });
      }
    };
  `;

  const blob = new Blob([workerScript], { type: 'text/javascript' });
  const workerUrl = window.URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);

  const cleanup = () => {
    worker.terminate();
    window.URL.revokeObjectURL(workerUrl);
  };

  const timeout = window.setTimeout(() => {
    cleanup();
    resolve({ error: 'Local check timed out.' });
  }, LOCAL_CHECK_TIMEOUT_MS);

  worker.onmessage = (event: MessageEvent<LocalRunnerResult>) => {
    window.clearTimeout(timeout);
    cleanup();
    resolve(event.data);
  };

  worker.onerror = (event) => {
    window.clearTimeout(timeout);
    cleanup();
    resolve({ error: event.message || 'Local check failed.' });
  };

  worker.postMessage({ code: stripNodeStdinInvocation(code), input });
});

const formatCategoryLabel = (category: string) => {
  return category
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getSubmissionTime = (submission: ChallengeSubmission) => submission.submitted_at || submission.created_at;

const formatSubmissionTime = (submission: ChallengeSubmission) => {
  const value = getSubmissionTime(submission);
  if (!value) return 'Time unavailable';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Time unavailable';

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getSubmissionStatusVariant = (status?: string) => {
  if (['PASSED', 'ACCEPTED'].includes(status || '')) return 'success';
  if (['FAILED', 'REJECTED'].includes(status || '')) return 'destructive';
  return 'warning';
};

const getChallengeErrorCategory = (error: unknown) => {
  if (!error) return 'unknown_error';
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes('sign in') || message.includes('auth') || message.includes('login')) return 'auth_required';
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) return 'network_error';
  return 'request_error';
};

const getSubmissionScoreBand = (score?: number | null) => {
  if (score === null || score === undefined || !Number.isFinite(score)) return 'none';
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

const SubmissionStatusIcon: React.FC<{ status?: string }> = ({ status }) => {
  if (['PASSED', 'ACCEPTED'].includes(status || '')) {
    return <CheckCircle2 size={16} className="text-success" />;
  }

  if (['FAILED', 'REJECTED'].includes(status || '')) {
    return <XCircle size={16} className="text-destructive" />;
  }

  return <Clock size={16} className="text-warning" />;
};

const ChallengesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { addToast } = useToast();
  const challenges = useAppSelector(selectAllChallenges);
  const { status, error } = useAppSelector((state) => state.challenges);
  const { user } = useAppSelector((state) => state.auth);
  const [filter, setFilter] = useState('all');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [language, setLanguage] = useState('javascript');
  const [solution, setSolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<ChallengeSubmission | null>(null);
  const [submissionHistory, setSubmissionHistory] = useState<ChallengeSubmission[]>([]);
  const [isLoadingSubmissionHistory, setIsLoadingSubmissionHistory] = useState(false);
  const [submissionHistoryError, setSubmissionHistoryError] = useState<string | null>(null);
  const [localCheckResults, setLocalCheckResults] = useState<LocalCheckResult[]>([]);
  const [localCheckSummary, setLocalCheckSummary] = useState<string | null>(null);
  const [isRunningLocalCheck, setIsRunningLocalCheck] = useState(false);
  const [isResetCodeReviewOpen, setIsResetCodeReviewOpen] = useState(false);
  const submissionHistoryRequestRef = useRef(0);

  const recordChallengeAction = useCallback((
    action: ChallengeWorkflowAnalyticsAction,
    extra: Omit<Parameters<typeof recordChallengeWorkflowAnalytics>[0], 'action' | 'userId'> = {}
  ) => {
    recordChallengeWorkflowAnalytics({
      userId: user?.id,
      action,
      ...extra,
    });
  }, [user?.id]);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchChallenges());
    }
  }, [dispatch, status]);

  const filtered = challenges.filter(c => 
    filter === 'all' || (c.category && c.category.toLowerCase() === filter.toLowerCase())
  );

  const categoryTabs = useMemo(() => {
    const categories = Array.from(new Set(challenges.map((challenge) => challenge.category).filter(Boolean))) as string[];
    return ['all', ...(categories.length > 0 ? categories : ['coding', 'design', 'architecture'])];
  }, [challenges]);

  const getChallengeAnalyticsContext = useCallback((challenge: Challenge) => ({
    challengeId: challenge.id,
    category: challenge.category,
    difficulty: challenge.difficulty,
    sampleCaseCount: getTestCases(challenge).length,
    runnableSampleCaseCount: getRunnableSampleCases(challenge).length,
  }), []);

  const handleOpenWorkspace = (challenge: Challenge) => {
    recordChallengeAction('challenge_workspace_opened', {
      ...getChallengeAnalyticsContext(challenge),
      entryPoint: 'challenge_card',
    });
    setSelectedChallenge(challenge);
    setLanguage('javascript');
    setSolution(getStarterCode(challenge));
    setLastSubmission(null);
    setSubmissionHistory([]);
    setSubmissionHistoryError(null);
    setLocalCheckResults([]);
    setLocalCheckSummary(null);
    setIsResetCodeReviewOpen(false);
  };

  const loadSubmissionHistory = useCallback(async (challengeId: string, entryPoint = 'workspace_load') => {
    const requestId = submissionHistoryRequestRef.current + 1;
    submissionHistoryRequestRef.current = requestId;

    if (!user?.id) {
      setIsLoadingSubmissionHistory(false);
      setSubmissionHistory([]);
      setLastSubmission(null);
      setSubmissionHistoryError('Sign in to load your retry history for this challenge.');
      recordChallengeAction('challenge_history_load_failed', {
        challengeId,
        entryPoint,
        errorCategory: 'auth_required',
      });
      return;
    }

    setIsLoadingSubmissionHistory(true);
    setSubmissionHistoryError(null);
    try {
      const submissions = await challengeService.getUserSubmissions(user.id, challengeId);
      if (submissionHistoryRequestRef.current !== requestId) return;
      setSubmissionHistory(submissions);
      setLastSubmission(submissions[0] || null);
      recordChallengeAction('challenge_history_loaded', {
        challengeId,
        entryPoint,
        attemptCount: submissions.length,
        hasPriorSubmission: submissions.length > 0,
      });
    } catch (historyError) {
      console.error('Failed to load challenge submissions:', historyError);
      if (submissionHistoryRequestRef.current !== requestId) return;
      setSubmissionHistory([]);
      setSubmissionHistoryError('Retry history could not be loaded. You can still submit a new solution.');
      recordChallengeAction('challenge_history_load_failed', {
        challengeId,
        entryPoint,
        errorCategory: getChallengeErrorCategory(historyError),
      });
    } finally {
      if (submissionHistoryRequestRef.current === requestId) {
        setIsLoadingSubmissionHistory(false);
      }
    }
  }, [recordChallengeAction, user?.id]);

  useEffect(() => {
    if (!selectedChallenge) {
      setIsResetCodeReviewOpen(false);
      return;
    }
    loadSubmissionHistory(selectedChallenge.id);
  }, [loadSubmissionHistory, selectedChallenge]);

  const handleResetCode = () => {
    if (!selectedChallenge) return;
    const starterCode = getStarterCode(selectedChallenge);

    if (solution === starterCode) {
      setLocalCheckResults([]);
      setLocalCheckSummary(null);
      setIsResetCodeReviewOpen(false);
      return;
    }

    recordChallengeAction('challenge_code_reset_review_opened', {
      ...getChallengeAnalyticsContext(selectedChallenge),
      language,
      solutionLength: solution.length,
    });
    setIsResetCodeReviewOpen(true);
  };

  const cancelResetCodeReview = () => {
    if (!selectedChallenge) {
      setIsResetCodeReviewOpen(false);
      return;
    }

    recordChallengeAction('challenge_code_reset_cancelled', {
      ...getChallengeAnalyticsContext(selectedChallenge),
      language,
      solutionLength: solution.length,
    });
    setIsResetCodeReviewOpen(false);
  };

  const confirmResetCode = () => {
    if (!selectedChallenge) return;
    recordChallengeAction('challenge_code_reset', {
      ...getChallengeAnalyticsContext(selectedChallenge),
      language,
      solutionLength: solution.length,
    });
    setSolution(getStarterCode(selectedChallenge));
    setLocalCheckResults([]);
    setLocalCheckSummary(null);
    setIsResetCodeReviewOpen(false);
  };

  const closeChallengeWorkspace = () => {
    if (isResetCodeReviewOpen) {
      cancelResetCodeReview();
    }
    setSelectedChallenge(null);
  };

  const handleRunLocalCheck = async () => {
    if (!selectedChallenge) return;

    if (!solution.trim()) {
      recordChallengeAction('challenge_local_check_failed', {
        ...getChallengeAnalyticsContext(selectedChallenge),
        language,
        solutionLength: solution.length,
        errorCategory: 'missing_solution',
      });
      addToast({
        type: 'warning',
        title: 'Solution required',
        message: 'Add code before running a local sample check.',
      });
      return;
    }

    if (!LOCAL_CHECK_SUPPORTED_LANGUAGES.has(language)) {
      recordChallengeAction('challenge_local_check_failed', {
        ...getChallengeAnalyticsContext(selectedChallenge),
        language,
        solutionLength: solution.length,
        errorCategory: 'unsupported_language',
      });
      addToast({
        type: 'warning',
        title: 'Local check unavailable',
        message: 'Local sample checks currently support JavaScript or TypeScript solve(input) solutions.',
      });
      return;
    }

    const runnableCases = getRunnableSampleCases(selectedChallenge).slice(0, 4);

    if (runnableCases.length === 0) {
      recordChallengeAction('challenge_local_check_failed', {
        ...getChallengeAnalyticsContext(selectedChallenge),
        language,
        solutionLength: solution.length,
        errorCategory: 'no_visible_sample_cases',
      });
      addToast({
        type: 'warning',
        title: 'No visible sample cases',
        message: 'This challenge does not expose input and expected output for local checking.',
      });
      return;
    }

    setIsRunningLocalCheck(true);
    setLocalCheckResults([]);
    setLocalCheckSummary('Running visible sample cases locally...');
    recordChallengeAction('challenge_local_check_started', {
      ...getChallengeAnalyticsContext(selectedChallenge),
      language,
      runnableSampleCaseCount: runnableCases.length,
      solutionLength: solution.length,
    });

    const results = await Promise.all(runnableCases.map(async (testCase, index) => {
      const input = getTestCaseInput(testCase);
      const expected = getTestCaseExpectedOutput(testCase);
      const runnerResult = await runLocalSampleCase(solution, input);
      const actual = runnerResult.actual || '';
      const status: LocalCheckStatus = runnerResult.error
        ? 'error'
        : normalizeSampleOutput(actual) === normalizeSampleOutput(expected)
          ? 'passed'
          : 'failed';

      return {
        id: testCase.id || `${selectedChallenge.id}-${index}`,
        label: `Case ${index + 1}`,
        input,
        expected,
        actual,
        status,
        detail: runnerResult.error
      };
    }));

    const passedCount = results.filter(result => result.status === 'passed').length;
    const errorCount = results.filter(result => result.status === 'error').length;
    const summary = `${passedCount}/${results.length} visible sample case${results.length === 1 ? '' : 's'} matched locally.`;
    setLocalCheckResults(results);
    setLocalCheckSummary(errorCount > 0 ? `${summary} ${errorCount} case${errorCount === 1 ? '' : 's'} could not run locally.` : summary);
    setIsRunningLocalCheck(false);
    recordChallengeAction('challenge_local_check_completed', {
      ...getChallengeAnalyticsContext(selectedChallenge),
      language,
      runnableSampleCaseCount: results.length,
      passedSampleCaseCount: passedCount,
      failedSampleCaseCount: results.filter(result => result.status === 'failed').length,
      errorSampleCaseCount: errorCount,
      solutionLength: solution.length,
    });

    addToast({
      type: passedCount === results.length ? 'success' : 'warning',
      title: passedCount === results.length ? 'Local check passed' : 'Review local check',
      message: summary,
    });
  };

  const handleSubmit = async () => {
    if (!selectedChallenge) return;

    if (!user?.id) {
      recordChallengeAction('challenge_submission_failed', {
        ...getChallengeAnalyticsContext(selectedChallenge),
        language,
        solutionLength: solution.length,
        attemptCount: submissionHistory.length,
        hasPriorSubmission: submissionHistory.length > 0,
        errorCategory: 'auth_required',
      });
      addToast({
        type: 'error',
        title: 'Sign in required',
        message: 'Please sign in before submitting a challenge solution.',
      });
      return;
    }

    if (!solution.trim()) {
      recordChallengeAction('challenge_submission_failed', {
        ...getChallengeAnalyticsContext(selectedChallenge),
        language,
        solutionLength: solution.length,
        attemptCount: submissionHistory.length,
        hasPriorSubmission: submissionHistory.length > 0,
        errorCategory: 'missing_solution',
      });
      addToast({
        type: 'error',
        title: 'Solution required',
        message: 'Add your solution before submitting.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const submission = await challengeService.submitChallengeSolution(
        selectedChallenge.id,
        user.id,
        language,
        solution.trim()
      );
      setLastSubmission(submission);
      setSubmissionHistory(prev => [
        submission,
        ...prev.filter((item) => item.id !== submission.id),
      ]);
      setSubmissionHistoryError(null);
      recordChallengeAction('challenge_submission_completed', {
        ...getChallengeAnalyticsContext(selectedChallenge),
        language,
        submissionStatus: submission.status,
        submissionScoreBand: getSubmissionScoreBand(submission.score),
        attemptCount: submissionHistory.length + 1,
        hasPriorSubmission: submissionHistory.length > 0,
        solutionLength: solution.length,
      });
      addToast({
        type: 'success',
        title: 'Solution submitted',
        message: 'Your challenge attempt has been saved.',
      });
    } catch (submitError) {
      console.error('Challenge submission failed:', submitError);
      recordChallengeAction('challenge_submission_failed', {
        ...getChallengeAnalyticsContext(selectedChallenge),
        language,
        attemptCount: submissionHistory.length,
        hasPriorSubmission: submissionHistory.length > 0,
        solutionLength: solution.length,
        errorCategory: getChallengeErrorCategory(submitError),
      });
      addToast({
        type: 'error',
        title: 'Submission failed',
        message: 'Please review your solution and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSolve = (challenge: Challenge) => {
    handleOpenWorkspace(challenge);
    addToast({
      type: 'info',
      title: 'Workspace ready',
      message: `Loaded ${challenge.title}`,
      duration: 3000
    });
  };

  const handleRefreshSubmissionHistory = () => {
    if (!selectedChallenge) return;
    recordChallengeAction('challenge_history_retry_clicked', {
      ...getChallengeAnalyticsContext(selectedChallenge),
      entryPoint: 'manual_retry',
      attemptCount: submissionHistory.length,
      hasPriorSubmission: submissionHistory.length > 0,
    });
    void loadSubmissionHistory(selectedChallenge.id, 'manual_retry');
  };

  const selectedTestCases = selectedChallenge ? getTestCases(selectedChallenge) : [];

  if (status === 'failed') {
    return <EmptyState title="Error" description={error || "Failed to load challenges."} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Challenges"
        description="Solve real-world problems and level up your skills."
      />

      <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-lg w-fit">
        {categoryTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              recordChallengeAction('challenge_category_selected', {
                category: tab,
                visibleChallengeCount: tab === 'all'
                  ? challenges.length
                  : challenges.filter(challenge => challenge.category?.toLowerCase() === tab.toLowerCase()).length,
              });
              setFilter(tab);
            }}
            className={`
              px-4 py-1.5 text-xs font-medium rounded-md transition-all
              ${filter === tab 
                ? 'bg-[var(--bg-primary)] text-accent shadow-sm' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}
            `}
          >
            {tab === 'all' ? 'All' : formatCategoryLabel(tab)}
          </button>
        ))}
      </div>

      {status === 'loading' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No challenges found" description="Try a different category." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((challenge) => (
            <Card key={challenge.id} className="group p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 rounded-lg bg-accent/10 text-accent">
                  <Trophy size={20} />
                </div>
                <Badge variant={getDifficultyVariant(challenge.difficulty)}>
                  {challenge.difficulty}
                </Badge>
              </div>
              
              <h3 className="font-semibold mb-2 group-hover:text-accent transition-colors">
                {challenge.title}
              </h3>
              <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-4">
                {challenge.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)]">
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><Users size={12} /> {challenge.participantCount || challenge.participantsCount || 0}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {challenge.duration || challenge.timeLimit || 'N/A'}</span>
                </div>
                <Button 
                  size="sm" 
                  className="h-8 text-[10px]"
                  onClick={() => handleSolve(challenge)}
                >
                  <Play size={12} />
                  Solve Now
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AuraModal
        isOpen={Boolean(selectedChallenge)}
        onClose={closeChallengeWorkspace}
        title={selectedChallenge?.title || 'Challenge Workspace'}
        size="xl"
      >
        {selectedChallenge && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_16rem] gap-4">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getDifficultyVariant(selectedChallenge.difficulty)}>
                    {selectedChallenge.difficulty}
                  </Badge>
                  {selectedChallenge.category && <Badge variant="outline">{selectedChallenge.category}</Badge>}
                  <Badge variant="outline">{selectedChallenge.xpReward || selectedChallenge.xp_reward || 0} XP</Badge>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText size={16} />
                    Prompt
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                    {selectedChallenge.description}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Code2 size={16} />
                      Solution
                    </h4>
                    <div className="flex items-center gap-2">
                      <label htmlFor="challenge-language" className="sr-only">Language</label>
                      <select
                        id="challenge-language"
                        value={language}
                        onChange={(event) => {
                          const nextLanguage = event.target.value;
                          recordChallengeAction('challenge_language_changed', {
                            ...getChallengeAnalyticsContext(selectedChallenge),
                            language: nextLanguage,
                            solutionLength: solution.length,
                          });
                          setLanguage(nextLanguage);
                          setLocalCheckResults([]);
                          setLocalCheckSummary(null);
                          setIsResetCodeReviewOpen(false);
                        }}
                        className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                      >
                        {LANGUAGES.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <Button type="button" variant="outline" size="sm" onClick={handleResetCode}>
                        <RotateCcw size={13} />
                        Reset
                      </Button>
                    </div>
                  </div>
                  {isResetCodeReviewOpen && (
                    <div
                      role="alert"
                      className="mb-3 rounded-lg border border-warning/30 bg-warning/10 p-3"
                    >
                      <p className="text-sm font-medium text-warning">Reset solution to starter code?</p>
                      <p className="mt-1 text-xs leading-relaxed text-warning">
                        This replaces your current editor contents with the starter code for this challenge. It does not submit your work or change retry history.
                      </p>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={cancelResetCodeReview}>
                          Keep Code
                        </Button>
                        <Button type="button" variant="destructive" size="sm" onClick={confirmResetCode}>
                          <RotateCcw size={13} />
                          Reset Code
                        </Button>
                      </div>
                    </div>
                  )}
                  <textarea
                    value={solution}
                    onChange={(event) => {
                      setSolution(event.target.value);
                      setLocalCheckResults([]);
                      setLocalCheckSummary(null);
                      setIsResetCodeReviewOpen(false);
                    }}
                    rows={14}
                    spellCheck={false}
                    className="w-full min-h-72 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 font-mono text-xs leading-5 text-[var(--text-primary)] outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
                  <h4 className="text-sm font-semibold mb-3">Sample Cases</h4>
                  {selectedTestCases.length > 0 ? (
                    <div className="space-y-3">
                      {selectedTestCases.slice(0, 4).map((testCase, index) => (
                        <div key={testCase.id || index} className="rounded-md border border-[var(--border-default)] p-3">
                          <p className="text-[10px] font-medium text-[var(--text-muted)] mb-1">Case {index + 1}</p>
                          {testCase.description && (
                            <p className="text-xs text-[var(--text-secondary)] mb-2">{testCase.description}</p>
                          )}
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-[var(--text-muted)]">Input</span>
                              <pre className="mt-1 whitespace-pre-wrap rounded bg-[var(--bg-secondary)] p-2">{testCase.input || testCase.test_case || 'Hidden'}</pre>
                            </div>
                            <div>
                              <span className="text-[var(--text-muted)]">Expected</span>
                              <pre className="mt-1 whitespace-pre-wrap rounded bg-[var(--bg-secondary)] p-2">{testCase.expectedOutput || testCase.expected_output || 'Hidden'}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">Test cases are hidden for this challenge.</p>
                  )}

                  {(localCheckSummary || localCheckResults.length > 0) && (
                    <div className="mt-4 border-t border-[var(--border-default)] pt-4">
                      {localCheckSummary && (
                        <p role="status" aria-live="polite" className="text-xs text-[var(--text-secondary)]">
                          {localCheckSummary}
                        </p>
                      )}
                      {localCheckResults.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {localCheckResults.map((result) => (
                            <div key={result.id} className="rounded-md border border-[var(--border-default)] p-3">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-[var(--text-primary)]">{result.label}</span>
                                <Badge variant={getLocalCheckStatusVariant(result.status)}>
                                  {result.status === 'passed' ? 'Matched' : result.status === 'failed' ? 'Mismatch' : 'Could not run'}
                                </Badge>
                              </div>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <span className="text-[var(--text-muted)]">Expected</span>
                                  <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-[var(--bg-secondary)] p-2">{result.expected || 'Hidden'}</pre>
                                </div>
                                <div>
                                  <span className="text-[var(--text-muted)]">Actual</span>
                                  <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-[var(--bg-secondary)] p-2">{result.detail || result.actual || 'No output'}</pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {lastSubmission && (
                  <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
                    <h4 className="text-sm font-semibold mb-3">Submission</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <SubmissionStatusIcon status={lastSubmission.status} />
                      <span className="text-sm font-medium">{lastSubmission.status}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Score: {lastSubmission.score ?? 0}
                    </p>
                    {lastSubmission.feedback && (
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">{lastSubmission.feedback}</p>
                    )}
                  </div>
                )}

                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold">Retry History</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshSubmissionHistory}
                      disabled={isLoadingSubmissionHistory || !user?.id}
                      aria-label="Refresh submission history"
                    >
                      <RefreshCw size={13} className={isLoadingSubmissionHistory ? 'animate-spin' : ''} />
                      Refresh
                    </Button>
                  </div>

                  {isLoadingSubmissionHistory ? (
                    <div className="space-y-2" aria-live="polite">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : submissionHistoryError ? (
                    <p className="text-xs text-[var(--text-muted)]">{submissionHistoryError}</p>
                  ) : submissionHistory.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">No attempts yet. Submit when you are ready to start tracking progress.</p>
                  ) : (
                    <div className="space-y-2">
                      {submissionHistory.slice(0, 5).map((submission, index) => (
                        <div key={submission.id || `${submission.challenge_id}-${index}`} className="rounded-md border border-[var(--border-default)] p-3">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <SubmissionStatusIcon status={submission.status} />
                              <span className="text-xs font-medium text-[var(--text-primary)]">Attempt {submissionHistory.length - index}</span>
                            </div>
                            <Badge variant={getSubmissionStatusVariant(submission.status)}>{submission.status}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
                            <span>{formatSubmissionTime(submission)}</span>
                            <span>{submission.language}</span>
                            <span>Score {submission.score ?? 0}</span>
                          </div>
                          {submission.feedback && (
                            <p className="mt-2 line-clamp-2 text-xs text-[var(--text-secondary)]">{submission.feedback}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4 border-t border-[var(--border-default)]">
              <Button variant="outline" onClick={closeChallengeWorkspace} disabled={isSubmitting}>
                Close
              </Button>
              <Button variant="outline" onClick={handleRunLocalCheck} isLoading={isRunningLocalCheck} disabled={isSubmitting}>
                <Play size={14} />
                Run Local Check
              </Button>
              <Button onClick={handleSubmit} isLoading={isSubmitting}>
                <Send size={14} />
                Submit Solution
              </Button>
            </div>
          </div>
        )}
      </AuraModal>
    </div>
  );
};

export default ChallengesPage;
