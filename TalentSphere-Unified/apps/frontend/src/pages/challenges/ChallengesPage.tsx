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

const LANGUAGES = ['javascript', 'python', 'java', 'typescript'];

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
  const submissionHistoryRequestRef = useRef(0);

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

  const handleOpenWorkspace = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setLanguage('javascript');
    setSolution(getStarterCode(challenge));
    setLastSubmission(null);
    setSubmissionHistory([]);
    setSubmissionHistoryError(null);
  };

  const loadSubmissionHistory = useCallback(async (challengeId: string) => {
    const requestId = submissionHistoryRequestRef.current + 1;
    submissionHistoryRequestRef.current = requestId;

    if (!user?.id) {
      setIsLoadingSubmissionHistory(false);
      setSubmissionHistory([]);
      setLastSubmission(null);
      setSubmissionHistoryError('Sign in to load your retry history for this challenge.');
      return;
    }

    setIsLoadingSubmissionHistory(true);
    setSubmissionHistoryError(null);
    try {
      const submissions = await challengeService.getUserSubmissions(user.id, challengeId);
      if (submissionHistoryRequestRef.current !== requestId) return;
      setSubmissionHistory(submissions);
      setLastSubmission(submissions[0] || null);
    } catch (historyError) {
      console.error('Failed to load challenge submissions:', historyError);
      if (submissionHistoryRequestRef.current !== requestId) return;
      setSubmissionHistory([]);
      setSubmissionHistoryError('Retry history could not be loaded. You can still submit a new solution.');
    } finally {
      if (submissionHistoryRequestRef.current === requestId) {
        setIsLoadingSubmissionHistory(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (!selectedChallenge) return;
    loadSubmissionHistory(selectedChallenge.id);
  }, [loadSubmissionHistory, selectedChallenge]);

  const handleResetCode = () => {
    if (!selectedChallenge) return;
    setSolution(getStarterCode(selectedChallenge));
  };

  const handleSubmit = async () => {
    if (!selectedChallenge) return;

    if (!user?.id) {
      addToast({
        type: 'error',
        title: 'Sign in required',
        message: 'Please sign in before submitting a challenge solution.',
      });
      return;
    }

    if (!solution.trim()) {
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
      addToast({
        type: 'success',
        title: 'Solution submitted',
        message: 'Your challenge attempt has been saved.',
      });
    } catch (submitError) {
      console.error('Challenge submission failed:', submitError);
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
            onClick={() => setFilter(tab)}
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
        onClose={() => setSelectedChallenge(null)}
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
                        onChange={(event) => setLanguage(event.target.value)}
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
                  <textarea
                    value={solution}
                    onChange={(event) => setSolution(event.target.value)}
                    rows={14}
                    spellCheck={false}
                    className="w-full min-h-72 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-4 font-mono text-xs leading-5 text-[var(--text-primary)] outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-4">
                  <h4 className="text-sm font-semibold mb-3">Sample Cases</h4>
                  {getTestCases(selectedChallenge).length > 0 ? (
                    <div className="space-y-3">
                      {getTestCases(selectedChallenge).slice(0, 4).map((testCase, index) => (
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
                      onClick={() => loadSubmissionHistory(selectedChallenge.id)}
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
              <Button variant="outline" onClick={() => setSelectedChallenge(null)} disabled={isSubmitting}>
                Close
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
