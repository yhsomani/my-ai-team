import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import Card from '../../components/shared/GlassCard';
import { Button } from '../../components/shared/AuraButton';
import { Badge } from '../../components/shared/Badge';
import { Search, Filter, User, Mail, Download, ExternalLink, CheckCircle, XCircle, Eye, RefreshCw, Briefcase, Calendar, StickyNote, Save, AlertTriangle, ChevronLeft, ChevronRight, CheckSquare, ClipboardCheck, TrendingUp } from 'lucide-react';
import { recruiterService, Application, CandidateNote, CandidateScorecard } from '../../services/recruiterService';
import { useAppSelector } from '../../store/hooks';
import { EmptyState } from '../../components/shared/EmptyState';
import { Skeleton } from '../../components/shared/Skeleton';
import { AuraModal } from '../../components/shared/AuraModal';
import { useToast } from '../../components/shared/Toast';
import {
  buildCandidateBulkInterviewSummary,
  buildCandidateBulkStatusSummary,
  buildCandidateAdvisorySignal,
  buildCandidateInterviewPlan,
  buildCandidateReviewDraftState,
  buildCandidateReviewFocusActions,
  buildCandidateReviewQueueAction,
  buildCandidateReviewQueueNavigation,
  buildCandidateScorecardAnalytics,
  buildCandidateScorecardSummary,
  candidateScorecardDimensions,
  canDraftCandidateInterviewPlan,
  canMoveCandidateToInterview,
  createDefaultCandidateScorecardRatings,
  filterCandidatesByReviewFocus,
  normalizeCandidateScorecardRating,
  type CandidateAdvisorySignal,
  type CandidateBulkStatusTarget,
  type CandidateReviewFocus,
  type CandidateScorecardRatings,
} from '../../lib/candidateInterviewPlanner';
import {
  recordCandidateWorkflowAnalytics,
  type CandidateWorkflowAnalyticsAction,
  type CandidateWorkflowAnalyticsEntryPoint,
} from '../../lib/candidateWorkflowAnalytics';

const statusVariant = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'OFFER': return 'success';
    case 'REJECTED': return 'destructive';
    case 'INTERVIEW': return 'outline';
    case 'REVIEWED': return 'outline';
    default: return 'warning';
  }
};

const formatCandidateDate = (date?: string) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

interface PendingStatusChange {
  candidate: Application;
  status: CandidateBulkStatusTarget;
}

const getStatusChangeCopy = (status?: PendingStatusChange['status']) => {
  switch (status) {
    case 'INTERVIEW':
      return {
        title: 'Confirm Interview Status',
        heading: 'Move this application to Interview?',
        confirmLabel: 'Confirm Interview',
        reason: 'Recruiter moved candidate to interview',
      };
    case 'OFFER':
      return {
        title: 'Confirm Offer Status',
        heading: 'Move this application to Offer?',
        confirmLabel: 'Confirm Offer',
        reason: 'Recruiter moved candidate to offer',
      };
    case 'REJECTED':
    default:
      return {
        title: 'Confirm Rejection',
        heading: 'Reject this application?',
        confirmLabel: 'Confirm Rejection',
        reason: 'Recruiter rejected candidate',
      };
  }
};

const getBulkStatusChangeCopy = (status?: CandidateBulkStatusTarget) => {
  switch (status) {
    case 'OFFER':
      return {
        title: 'Review Bulk Offer Move',
        heading: 'Move selected Interview candidates to Offer?',
        confirmLabel: 'Confirm Offer Moves',
        reason: 'Recruiter moved selected candidates to offer',
        description: 'Only candidates currently in Interview will move to Offer. This does not send offer letters, messages, or notifications.',
      };
    case 'REJECTED':
      return {
        title: 'Review Bulk Rejection',
        heading: 'Reject selected eligible applications?',
        confirmLabel: 'Confirm Rejections',
        reason: 'Recruiter rejected selected candidates',
        description: 'Offered and already rejected candidates are skipped. This does not send rejection messages or contact candidates.',
      };
    case 'INTERVIEW':
    default:
      return {
        title: 'Review Bulk Interview Move',
        heading: 'Move selected eligible applications to Interview?',
        confirmLabel: 'Confirm Interview Moves',
        reason: 'Recruiter moved selected candidates to interview',
        description: 'This updates application statuses only. It does not send messages, schedule video sessions, or change skipped candidates.',
      };
  }
};

const candidatePageSizeOptions = [10, 25, 50];
const defaultCandidatePageSize = 10;
type CandidateSortMode = 'recent' | 'advisory';
const candidateSortOptions: Array<{ value: CandidateSortMode; label: string }> = [
  { value: 'recent', label: 'Newest' },
  { value: 'advisory', label: 'Advisory signal' },
];
const candidateReviewFocusOptions: Array<{ value: CandidateReviewFocus; label: string }> = [
  { value: 'all', label: 'All visible' },
  { value: 'needs_scorecard', label: 'Needs scorecard' },
  { value: 'high_signal', label: 'High signal' },
];
const candidatePanelClassName = 'surface-panel p-3';
const candidateMetricCardClassName = 'surface-panel flex min-h-32 flex-col justify-between px-4 py-3';
const candidateRecordCardClassName = 'group flex min-h-32 flex-col gap-4 p-5 transition-colors hover:border-[var(--border-strong)] md:flex-row md:items-center md:justify-between';
const candidateReviewSectionClassName = 'surface-panel p-4';
const candidateInsetClassName = 'rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)]/60 px-3 py-2';
const candidateOfferButtonClassName = 'border-0 bg-success text-[var(--text-inverse)] hover:bg-success/90';
const candidateDangerButtonClassName = 'border-destructive text-destructive hover:bg-destructive/10';

const getCandidateNotesStorageKey = (recruiterId?: string) => `talentsphere.candidateNotes.${recruiterId || 'guest'}`;
const getCandidateScorecardsStorageKey = (recruiterId?: string) => `talentsphere.candidateScorecards.${recruiterId || 'guest'}`;

const getCandidateWorkflowErrorCategory = (error: unknown, fallback: string) => (
  error instanceof Error ? error.name : fallback
);

const sanitizeCandidateNotes = (value: unknown): Record<string, CandidateNote> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, Partial<CandidateNote>>).reduce<Record<string, CandidateNote>>((acc, [applicationId, item]) => {
    if (
      typeof item?.applicationId === 'string' &&
      typeof item.note === 'string' &&
      typeof item.updatedAt === 'string'
    ) {
      acc[applicationId] = {
        applicationId: item.applicationId,
        note: item.note,
        updatedAt: item.updatedAt,
        source: item.source === 'server' ? 'server' : 'local'
      };
    }

    return acc;
  }, {});
};

const sanitizeCandidateScorecards = (value: unknown): Record<string, CandidateScorecard> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, Partial<CandidateScorecard>>).reduce<Record<string, CandidateScorecard>>((acc, [applicationId, item]) => {
    if (
      typeof item?.applicationId === 'string' &&
      item.ratings &&
      typeof item.ratings === 'object' &&
      typeof item.updatedAt === 'string'
    ) {
      acc[applicationId] = {
        applicationId: item.applicationId,
        ratings: candidateScorecardDimensions.reduce<CandidateScorecardRatings>((ratings, dimension) => {
          ratings[dimension.key] = normalizeCandidateScorecardRating(item.ratings?.[dimension.key]);
          return ratings;
        }, {} as CandidateScorecardRatings),
        evidence: typeof item.evidence === 'string' ? item.evidence : '',
        updatedAt: item.updatedAt,
        source: item.source === 'server' ? 'server' : 'local',
      };
    }

    return acc;
  }, {});
};

const CandidatesPage: React.FC = () => {
  const { user } = useAppSelector((state: any) => state.auth);
  const { addToast } = useToast();
  const [candidates, setCandidates] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
  const [candidateNotes, setCandidateNotes] = useState<Record<string, CandidateNote>>({});
  const [candidateScorecards, setCandidateScorecards] = useState<Record<string, CandidateScorecard>>({});
  const [draftNote, setDraftNote] = useState('');
  const [scorecardRatings, setScorecardRatings] = useState<CandidateScorecardRatings>(() => createDefaultCandidateScorecardRatings());
  const [scorecardEvidence, setScorecardEvidence] = useState('');
  const [isCandidateReviewResetOpen, setIsCandidateReviewResetOpen] = useState(false);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [savingScorecardId, setSavingScorecardId] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [statusChangeError, setStatusChangeError] = useState<string | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [bulkStatusTarget, setBulkStatusTarget] = useState<CandidateBulkStatusTarget | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkStatusError, setBulkStatusError] = useState<string | null>(null);
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidatePageSize, setCandidatePageSize] = useState(defaultCandidatePageSize);
  const [candidateSortMode, setCandidateSortMode] = useState<CandidateSortMode>('recent');
  const [candidateReviewFocus, setCandidateReviewFocus] = useState<CandidateReviewFocus>('all');
  const [candidateTotal, setCandidateTotal] = useState<number | null>(null);
  const [candidateHasNext, setCandidateHasNext] = useState(false);
  const [candidatePageCursors, setCandidatePageCursors] = useState<Record<number, string>>({});
  const normalizedSearchTerm = searchTerm.trim().replace(/\s+/g, ' ');
  const currentCandidateCursor = candidatePage > 1 ? candidatePageCursors[candidatePage] : undefined;
  const notesStorageKey = useMemo(() => getCandidateNotesStorageKey(user?.id), [user?.id]);
  const scorecardsStorageKey = useMemo(() => getCandidateScorecardsStorageKey(user?.id), [user?.id]);
  const selectedInterviewPlan = useMemo(() => (
    selectedCandidate
      ? buildCandidateInterviewPlan({
        candidateName: selectedCandidate.user?.fullName,
        candidateEmail: selectedCandidate.user?.email,
        roleTitle: selectedCandidate.job?.title || `Job #${selectedCandidate.jobId}`,
      })
      : null
  ), [selectedCandidate]);
  const selectedScorecardSummary = useMemo(() => (
    selectedCandidate
      ? buildCandidateScorecardSummary({
        candidateName: selectedCandidate.user?.fullName,
        roleTitle: selectedCandidate.job?.title || `Job #${selectedCandidate.jobId}`,
        ratings: scorecardRatings,
        evidence: scorecardEvidence,
      })
      : null
  ), [scorecardEvidence, scorecardRatings, selectedCandidate]);

  const readLocalCandidateNotes = useCallback(() => {
    try {
      const stored = window.localStorage.getItem(notesStorageKey);
      return stored ? sanitizeCandidateNotes(JSON.parse(stored)) : {};
    } catch (error) {
      console.error('Failed to load candidate notes:', error);
      return {};
    }
  }, [notesStorageKey]);

  const readLocalCandidateScorecards = useCallback(() => {
    try {
      const stored = window.localStorage.getItem(scorecardsStorageKey);
      return stored ? sanitizeCandidateScorecards(JSON.parse(stored)) : {};
    } catch (error) {
      console.error('Failed to load candidate scorecards:', error);
      return {};
    }
  }, [scorecardsStorageKey]);

  const fetchCandidates = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const page = await recruiterService.getApplicationsPage(user.id, {
        limit: candidatePageSize,
        offset: (candidatePage - 1) * candidatePageSize,
        search: normalizedSearchTerm || undefined,
        cursor: currentCandidateCursor
      });

      setCandidates(page.applications);
      setCandidateTotal(currentTotal => page.total !== null ? page.total : currentTotal);
      setCandidateHasNext(page.hasNext);
      setCandidatePageCursors(currentCursors => {
        const nextPage = candidatePage + 1;
        if (!page.nextCursor) {
          if (!currentCursors[nextPage]) return currentCursors;
          const next = { ...currentCursors };
          delete next[nextPage];
          return next;
        }

        if (currentCursors[nextPage] === page.nextCursor) return currentCursors;
        return { ...currentCursors, [nextPage]: page.nextCursor };
      });
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
      setCandidates([]);
      setCandidateTotal(null);
      setCandidateHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [candidatePage, candidatePageSize, currentCandidateCursor, normalizedSearchTerm, user?.id]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  useEffect(() => {
    setCandidatePage(1);
    setCandidatePageCursors({});
    setCandidateTotal(null);
  }, [candidatePageSize, normalizedSearchTerm]);

  useEffect(() => {
    setSelectedCandidateIds([]);
    setBulkStatusError(null);
    setBulkStatusTarget(null);
  }, [candidatePage, candidatePageSize, candidateReviewFocus, normalizedSearchTerm]);

  useEffect(() => {
    setCandidateNotes(readLocalCandidateNotes());
  }, [readLocalCandidateNotes]);

  useEffect(() => {
    setCandidateScorecards(readLocalCandidateScorecards());
  }, [readLocalCandidateScorecards]);

  useEffect(() => {
    const currentPageCandidateIds = new Set(candidates.map(candidate => candidate.id));
    setSelectedCandidateIds(currentIds => currentIds.filter(id => currentPageCandidateIds.has(id)));
  }, [candidates]);

  const persistCandidateNotes = useCallback((nextNotes: Record<string, CandidateNote>) => {
    setCandidateNotes(nextNotes);

    try {
      window.localStorage.setItem(notesStorageKey, JSON.stringify(nextNotes));
    } catch (error) {
      console.error('Failed to save candidate notes:', error);
    }
  }, [notesStorageKey]);

  useEffect(() => {
    if (!user?.id || candidates.length === 0) return;

    let isActive = true;
    const loadServerNotes = async () => {
      const localNotes = readLocalCandidateNotes();
      setCandidateNotes(localNotes);

      try {
        const serverNotes = await recruiterService.getCandidateNotes(user.id, candidates.map(candidate => candidate.id));
        if (!isActive) return;

        persistCandidateNotes({
          ...localNotes,
          ...serverNotes
        });
      } catch (error) {
        console.warn('Using local candidate notes fallback:', error);
      }
    };

    loadServerNotes();

    return () => {
      isActive = false;
    };
  }, [candidates, persistCandidateNotes, readLocalCandidateNotes, user?.id]);

  useEffect(() => {
    setDraftNote(selectedCandidate ? candidateNotes[selectedCandidate.id]?.note || '' : '');
    setIsCandidateReviewResetOpen(false);
  }, [candidateNotes, selectedCandidate]);

  useEffect(() => {
    const savedScorecard = selectedCandidate ? candidateScorecards[selectedCandidate.id] : null;
    setScorecardRatings(savedScorecard?.ratings || createDefaultCandidateScorecardRatings());
    setScorecardEvidence(savedScorecard?.evidence || '');
    setIsCandidateReviewResetOpen(false);
  }, [candidateScorecards, selectedCandidate]);

  const persistCandidateScorecards = useCallback((nextScorecards: Record<string, CandidateScorecard>) => {
    setCandidateScorecards(nextScorecards);

    try {
      window.localStorage.setItem(scorecardsStorageKey, JSON.stringify(nextScorecards));
    } catch (error) {
      console.error('Failed to save candidate scorecards:', error);
    }
  }, [scorecardsStorageKey]);

  useEffect(() => {
    if (!user?.id || candidates.length === 0) return;

    let isActive = true;
    const loadServerScorecards = async () => {
      const localScorecards = readLocalCandidateScorecards();
      setCandidateScorecards(localScorecards);

      try {
        const serverScorecards = await recruiterService.getCandidateScorecards(user.id, candidates.map(candidate => candidate.id));
        if (!isActive) return;

        persistCandidateScorecards({
          ...localScorecards,
          ...serverScorecards
        });
      } catch (error) {
        console.warn('Using local candidate scorecards fallback:', error);
      }
    };

    loadServerScorecards();

    return () => {
      isActive = false;
    };
  }, [candidates, persistCandidateScorecards, readLocalCandidateScorecards, user?.id]);

  const handleStatusUpdate = async (applicationId: string, newStatus: string): Promise<boolean> => {
    const currentApplication = candidates.find(candidate => candidate.id === applicationId) || selectedCandidate;
    setUpdatingId(applicationId);

    try {
      const updated = await recruiterService.updateApplicationStatus(applicationId, newStatus, {
        changedBy: user?.id,
        previousStatus: currentApplication?.status,
        reason: getStatusChangeCopy(newStatus as PendingStatusChange['status']).reason,
      });
      setCandidates(prev =>
        prev.map(c => c.id === applicationId ? { ...c, status: updated.status } : c)
      );
      setSelectedCandidate(prev =>
        prev?.id === applicationId ? { ...prev, status: updated.status, updatedAt: updated.updatedAt } : prev
      );
      setStatusChangeError(null);
      if (currentApplication) {
        recordCandidateAnalyticsForApplication('candidate_status_completed', currentApplication, {
          targetStatus: updated.status,
          previousStatus: currentApplication.status,
        });
      } else {
        recordCandidateWorkflowAnalytics({
          userId: user?.id,
          action: 'candidate_status_completed',
          applicationId,
          targetStatus: updated.status,
        });
      }
      return true;
    } catch (err) {
      console.error('Failed to update status:', err);
      setStatusChangeError('The application status could not be updated. No change was saved.');
      if (currentApplication) {
        recordCandidateAnalyticsForApplication('candidate_status_failed', currentApplication, {
          targetStatus: newStatus,
          previousStatus: currentApplication.status,
          errorCategory: getCandidateWorkflowErrorCategory(err, 'candidate_status_update_failed'),
        });
      } else {
        recordCandidateWorkflowAnalytics({
          userId: user?.id,
          action: 'candidate_status_failed',
          applicationId,
          targetStatus: newStatus,
          errorCategory: getCandidateWorkflowErrorCategory(err, 'candidate_status_update_failed'),
        });
      }
      return false;
    } finally {
      setUpdatingId(null);
    }
  };

  const requestStatusChange = (candidate: Application, status: PendingStatusChange['status']) => {
    setStatusChangeError(null);
    recordCandidateAnalyticsForApplication('candidate_status_review_opened', candidate, {
      targetStatus: status,
      entryPoint: selectedCandidate?.id === candidate.id ? 'modal' : 'row',
    });
    setPendingStatusChange({ candidate, status });
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;

    const didUpdate = await handleStatusUpdate(pendingStatusChange.candidate.id, pendingStatusChange.status);
    if (didUpdate) {
      setPendingStatusChange(null);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedCandidate || !user?.id) return;

    setIsCandidateReviewResetOpen(false);
    setSavingNoteId(selectedCandidate.id);
    const trimmedNote = draftNote.trim();
    const nextNotes = { ...candidateNotes };

    if (trimmedNote) {
      nextNotes[selectedCandidate.id] = {
        applicationId: selectedCandidate.id,
        recruiterId: user.id,
        note: trimmedNote,
        updatedAt: new Date().toISOString(),
        source: 'local'
      };
    } else {
      delete nextNotes[selectedCandidate.id];
    }

    persistCandidateNotes(nextNotes);

    try {
      const serverNote = await recruiterService.saveCandidateNote(user.id, selectedCandidate.id, trimmedNote);
      const syncedNotes = { ...nextNotes };

      if (serverNote) {
        syncedNotes[selectedCandidate.id] = serverNote;
      } else {
        delete syncedNotes[selectedCandidate.id];
      }

      persistCandidateNotes(syncedNotes);
      addToast({
        type: 'success',
        title: trimmedNote ? 'Recruiter note saved' : 'Recruiter note removed'
      });
    } catch (error) {
      console.warn('Candidate note saved locally only:', error);
      addToast({
        type: 'warning',
        title: 'Note saved locally',
        message: 'Server note sync is unavailable. Your note remains in this browser.'
      });
    } finally {
      setSavingNoteId(null);
    }
  };

  const insertInterviewPlanIntoNotes = () => {
    if (!selectedInterviewPlan) return;

    setIsCandidateReviewResetOpen(false);
    setDraftNote(currentDraft => (
      [currentDraft.trim(), selectedInterviewPlan.noteDraft]
        .filter(Boolean)
        .join('\n\n')
    ));
    if (selectedCandidate) {
      recordCandidateAnalyticsForApplication('candidate_interview_plan_inserted', selectedCandidate);
    }
    addToast({
      type: 'success',
      title: 'Interview plan drafted',
      message: 'Review or edit the private note before saving.'
    });
  };

  const updateScorecardRating = (dimensionKey: keyof CandidateScorecardRatings, value: unknown) => {
    setIsCandidateReviewResetOpen(false);
    setScorecardRatings(currentRatings => ({
      ...currentRatings,
      [dimensionKey]: normalizeCandidateScorecardRating(value),
    }));
  };

  const saveCandidateScorecard = async () => {
    if (!selectedCandidate) return;

    setIsCandidateReviewResetOpen(false);
    setSavingScorecardId(selectedCandidate.id);
    const trimmedEvidence = scorecardEvidence.trim();
    const nextScorecards = {
      ...candidateScorecards,
      [selectedCandidate.id]: {
        applicationId: selectedCandidate.id,
        recruiterId: user?.id,
        ratings: scorecardRatings,
        evidence: trimmedEvidence,
        updatedAt: new Date().toISOString(),
        source: 'local' as const,
      },
    };

    persistCandidateScorecards(nextScorecards);

    if (!user?.id) {
      setSavingScorecardId(null);
      recordCandidateAnalyticsForApplication('candidate_scorecard_saved', selectedCandidate, {
        hasScorecard: true,
        scorecardSource: 'local',
      });
      addToast({
        type: 'warning',
        title: 'Scorecard saved locally',
        message: 'Sign in as a recruiter to sync scorecards across devices.'
      });
      return;
    }

    try {
      const serverScorecard = await recruiterService.saveCandidateScorecard(user.id, selectedCandidate.id, {
        ratings: scorecardRatings,
        evidence: trimmedEvidence,
      });

      persistCandidateScorecards({
        ...nextScorecards,
        [selectedCandidate.id]: serverScorecard,
      });
      recordCandidateAnalyticsForApplication('candidate_scorecard_saved', selectedCandidate, {
        hasScorecard: true,
        scorecardSource: 'server',
      });
      addToast({
        type: 'success',
        title: 'Scorecard saved',
        message: 'This is a private recruiter aid and does not change candidate status.'
      });
    } catch (error) {
      console.warn('Candidate scorecard saved locally only:', error);
      recordCandidateAnalyticsForApplication('candidate_scorecard_saved', selectedCandidate, {
        hasScorecard: true,
        scorecardSource: 'local',
      });
      addToast({
        type: 'warning',
        title: 'Scorecard saved locally',
        message: 'Server scorecard sync is unavailable. Your scorecard remains in this browser.'
      });
    } finally {
      setSavingScorecardId(null);
    }
  };

  const insertScorecardIntoNotes = () => {
    if (!selectedScorecardSummary) return;

    setIsCandidateReviewResetOpen(false);
    setDraftNote(currentDraft => (
      [currentDraft.trim(), selectedScorecardSummary.noteDraft]
        .filter(Boolean)
        .join('\n\n')
    ));
    if (selectedCandidate) {
      recordCandidateAnalyticsForApplication('candidate_scorecard_summary_added_to_notes', selectedCandidate);
    }
    addToast({
      type: 'success',
      title: 'Scorecard added to notes',
      message: 'Review or edit the private note before saving.'
    });
  };

  const candidateAdvisorySignals = useMemo(() => (
    candidates.reduce<Record<string, CandidateAdvisorySignal>>((acc, candidate) => {
      const scorecard = candidateScorecards[candidate.id];
      const scorecardSummary = scorecard
        ? buildCandidateScorecardSummary({
          candidateName: candidate.user?.fullName,
          roleTitle: candidate.job?.title || `Job #${candidate.jobId}`,
          ratings: scorecard.ratings,
          evidence: scorecard.evidence,
        })
        : null;

      acc[candidate.id] = buildCandidateAdvisorySignal({
        status: candidate.status,
        hasResume: Boolean(candidate.resumeUrl),
        hasCoverLetter: Boolean(candidate.coverLetter?.trim()),
        hasRecruiterNote: Boolean(candidateNotes[candidate.id]?.note?.trim()),
        scorecardAverage: scorecardSummary?.averageScore ?? null,
        scorecardSource: scorecard?.source,
      });
      return acc;
    }, {})
  ), [candidateNotes, candidateScorecards, candidates]);

  // ⚡ Bolt: Memoize filtered candidates and hoist lowercasing to prevent O(N) recalculations on every render
  const filtered = useMemo(() => {
    const lowerSearch = normalizedSearchTerm.toLowerCase();
    const visibleCandidates = normalizedSearchTerm
      ? candidates.filter(c => (
          c.user?.fullName?.toLowerCase().includes(lowerSearch) ||
          c.user?.email?.toLowerCase().includes(lowerSearch) ||
          c.job?.title?.toLowerCase().includes(lowerSearch)
        ))
      : candidates;

    const focusedCandidates = filterCandidatesByReviewFocus(
      visibleCandidates.map(candidate => ({
        ...candidate,
        hasScorecard: Boolean(candidateScorecards[candidate.id]),
        advisoryScore: candidateAdvisorySignals[candidate.id]?.score ?? null,
      })),
      candidateReviewFocus
    );

    if (candidateSortMode !== 'advisory') return focusedCandidates;

    return [...focusedCandidates].sort((a, b) => {
      const signalDelta = (candidateAdvisorySignals[b.id]?.score || 0) - (candidateAdvisorySignals[a.id]?.score || 0);
      if (signalDelta !== 0) return signalDelta;
      return new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime();
    });
  }, [candidateAdvisorySignals, candidateReviewFocus, candidateScorecards, candidateSortMode, candidates, normalizedSearchTerm]);

  const selectedCandidateSet = useMemo(() => new Set(selectedCandidateIds), [selectedCandidateIds]);
  const selectedCandidates = useMemo(
    () => candidates.filter(candidate => selectedCandidateSet.has(candidate.id)),
    [candidates, selectedCandidateSet]
  );
  const selectedCandidateBulkItems = useMemo(() => (
    selectedCandidates.map(candidate => ({
      id: candidate.id,
      status: candidate.status,
      candidateName: candidate.user?.fullName,
      roleTitle: candidate.job?.title || `Job #${candidate.jobId}`,
    }))
  ), [selectedCandidates]);
  const bulkInterviewSummary = useMemo(() => buildCandidateBulkInterviewSummary(
    selectedCandidateBulkItems
  ), [selectedCandidateBulkItems]);
  const bulkOfferSummary = useMemo(() => buildCandidateBulkStatusSummary(
    selectedCandidateBulkItems,
    'OFFER'
  ), [selectedCandidateBulkItems]);
  const bulkRejectSummary = useMemo(() => buildCandidateBulkStatusSummary(
    selectedCandidateBulkItems,
    'REJECTED'
  ), [selectedCandidateBulkItems]);
  const activeBulkStatusSummary = useMemo(() => buildCandidateBulkStatusSummary(
    selectedCandidateBulkItems,
    bulkStatusTarget || 'INTERVIEW'
  ), [bulkStatusTarget, selectedCandidateBulkItems]);
  const selectedCandidateById = useMemo(
    () => new Map(selectedCandidates.map(candidate => [candidate.id, candidate])),
    [selectedCandidates]
  );
  const activeBulkStatusCandidates = useMemo(
    () => activeBulkStatusSummary.eligible
      .map(candidate => selectedCandidateById.get(candidate.id))
      .filter((candidate): candidate is Application => Boolean(candidate)),
    [activeBulkStatusSummary.eligible, selectedCandidateById]
  );
  const allVisibleCandidatesSelected = filtered.length > 0 && filtered.every(candidate => selectedCandidateSet.has(candidate.id));
  const visibleHighSignalCount = useMemo(() => (
    filtered.filter(candidate => (candidateAdvisorySignals[candidate.id]?.score || 0) >= 80).length
  ), [candidateAdvisorySignals, filtered]);
  const visibleScorecardAnalytics = useMemo(() => buildCandidateScorecardAnalytics(
    filtered.map(candidate => {
      const scorecard = candidateScorecards[candidate.id];
      if (!scorecard) {
        return { id: candidate.id, scorecardAverage: null };
      }

      const scorecardSummary = buildCandidateScorecardSummary({
        candidateName: candidate.user?.fullName,
        roleTitle: candidate.job?.title || `Job #${candidate.jobId}`,
        ratings: scorecard.ratings,
        evidence: scorecard.evidence,
      });

      return {
        id: candidate.id,
        scorecardAverage: scorecardSummary.averageScore,
        source: scorecard.source,
      };
    })
  ), [candidateScorecards, filtered]);
  const candidateReviewFocusActions = useMemo(() => buildCandidateReviewFocusActions({
    currentFocus: candidateReviewFocus,
    totalCount: visibleScorecardAnalytics.totalCount,
    unscoredCount: visibleScorecardAnalytics.unscoredCount,
    highSignalCount: visibleHighSignalCount,
  }), [candidateReviewFocus, visibleHighSignalCount, visibleScorecardAnalytics]);
  const reviewGapsFocusAction = candidateReviewFocusActions.find(action => action.focus === 'needs_scorecard');
  const reviewHighSignalFocusAction = candidateReviewFocusActions.find(action => action.focus === 'high_signal');
  const showAllFocusAction = candidateReviewFocusActions.find(action => action.focus === 'all');
  const candidateReviewQueueItems = useMemo(() => filtered.map(candidate => ({
    id: candidate.id,
    candidateName: candidate.user?.fullName,
    roleTitle: candidate.job?.title || `Job #${candidate.jobId}`,
  })), [filtered]);
  const candidateReviewQueueAction = useMemo(() => buildCandidateReviewQueueAction({
    focus: candidateReviewFocus,
    candidates: candidateReviewQueueItems,
  }), [candidateReviewFocus, candidateReviewQueueItems]);
  const selectedCandidateReviewNavigation = useMemo(() => buildCandidateReviewQueueNavigation({
    currentCandidateId: selectedCandidate?.id,
    candidates: candidateReviewQueueItems,
  }), [candidateReviewQueueItems, selectedCandidate?.id]);
  const selectedCandidateSavedNote = selectedCandidate ? candidateNotes[selectedCandidate.id]?.note || '' : '';
  const selectedCandidateSavedScorecard = selectedCandidate ? candidateScorecards[selectedCandidate.id] : null;
  const selectedCandidateReviewDraftState = useMemo(() => buildCandidateReviewDraftState({
    savedNote: selectedCandidateSavedNote,
    draftNote,
    savedRatings: selectedCandidateSavedScorecard?.ratings,
    draftRatings: scorecardRatings,
    savedEvidence: selectedCandidateSavedScorecard?.evidence || '',
    draftEvidence: scorecardEvidence,
  }), [
    draftNote,
    scorecardEvidence,
    scorecardRatings,
    selectedCandidateSavedNote,
    selectedCandidateSavedScorecard,
  ]);

  const recordCandidateAnalyticsForApplication = useCallback((
    action: CandidateWorkflowAnalyticsAction,
    candidate: Application,
    extra: {
      targetStatus?: CandidateBulkStatusTarget | string;
      previousStatus?: string | null;
      reviewFocus?: CandidateReviewFocus;
      entryPoint?: CandidateWorkflowAnalyticsEntryPoint;
      hasScorecard?: boolean;
      scorecardSource?: 'server' | 'local' | 'none';
      hasUnsavedNote?: boolean;
      hasUnsavedScorecard?: boolean;
      errorCategory?: string;
    } = {}
  ) => {
    const scorecard = candidateScorecards[candidate.id];

    recordCandidateWorkflowAnalytics({
      userId: user?.id,
      action,
      applicationId: candidate.id,
      jobId: candidate.jobId,
      previousStatus: extra.previousStatus ?? candidate.status,
      hasScorecard: Boolean(scorecard),
      hasRecruiterNote: Boolean(candidateNotes[candidate.id]?.note?.trim()),
      advisoryScore: candidateAdvisorySignals[candidate.id]?.score,
      scorecardSource: scorecard?.source || 'none',
      ...extra,
    });
  }, [candidateAdvisorySignals, candidateNotes, candidateScorecards, user?.id]);

  const applyCandidateReviewFocus = useCallback((focus: CandidateReviewFocus) => {
    const focusAction = candidateReviewFocusActions.find(action => action.focus === focus);

    recordCandidateWorkflowAnalytics({
      userId: user?.id,
      action: 'candidate_review_focus_applied',
      reviewFocus: focus,
      entryPoint: 'focus_action',
      visibleCount: filtered.length,
      selectedCount: selectedCandidates.length,
      eligibleCount: focusAction?.count,
    });

    setCandidateReviewFocus(focus);
    setCandidatePage(1);
  }, [candidateReviewFocusActions, filtered.length, selectedCandidates.length, user?.id]);

  const openCandidateInReviewQueue = useCallback((
    candidateId: string | null,
    entryPoint: CandidateWorkflowAnalyticsEntryPoint = 'queue_first'
  ) => {
    if (!candidateId) return;
    const candidate = filtered.find(item => item.id === candidateId);
    if (candidate) {
      recordCandidateAnalyticsForApplication('candidate_review_queue_opened', candidate, {
        entryPoint,
        reviewFocus: candidateReviewFocus,
      });
      setSelectedCandidate(candidate);
    }
  }, [candidateReviewFocus, filtered, recordCandidateAnalyticsForApplication]);

  const openFirstCandidateInReviewQueue = useCallback(() => {
    openCandidateInReviewQueue(candidateReviewQueueAction.candidateId, 'queue_first');
  }, [candidateReviewQueueAction.candidateId, openCandidateInReviewQueue]);

  const openCandidateReviewResetReview = useCallback(() => {
    if (!selectedCandidate || !selectedCandidateReviewDraftState.hasUnsavedChanges) return;

    recordCandidateAnalyticsForApplication('candidate_review_reset_review_opened', selectedCandidate, {
      entryPoint: 'modal',
      hasUnsavedNote: selectedCandidateReviewDraftState.hasUnsavedNote,
      hasUnsavedScorecard: selectedCandidateReviewDraftState.hasUnsavedScorecard,
    });
    setIsCandidateReviewResetOpen(true);
  }, [recordCandidateAnalyticsForApplication, selectedCandidate, selectedCandidateReviewDraftState]);

  const cancelCandidateReviewResetReview = useCallback(() => {
    if (!selectedCandidate) {
      setIsCandidateReviewResetOpen(false);
      return;
    }

    recordCandidateAnalyticsForApplication('candidate_review_reset_cancelled', selectedCandidate, {
      entryPoint: 'modal',
      hasUnsavedNote: selectedCandidateReviewDraftState.hasUnsavedNote,
      hasUnsavedScorecard: selectedCandidateReviewDraftState.hasUnsavedScorecard,
    });
    setIsCandidateReviewResetOpen(false);
  }, [recordCandidateAnalyticsForApplication, selectedCandidate, selectedCandidateReviewDraftState]);

  const confirmCandidateReviewReset = useCallback(() => {
    if (!selectedCandidate) {
      setIsCandidateReviewResetOpen(false);
      return;
    }

    recordCandidateAnalyticsForApplication('candidate_review_reset_confirmed', selectedCandidate, {
      entryPoint: 'modal',
      hasUnsavedNote: selectedCandidateReviewDraftState.hasUnsavedNote,
      hasUnsavedScorecard: selectedCandidateReviewDraftState.hasUnsavedScorecard,
    });
    setDraftNote(selectedCandidateSavedNote);
    setScorecardRatings(selectedCandidateSavedScorecard?.ratings || createDefaultCandidateScorecardRatings());
    setScorecardEvidence(selectedCandidateSavedScorecard?.evidence || '');
    setIsCandidateReviewResetOpen(false);
    addToast({
      type: 'info',
      title: 'Review drafts reset',
      message: 'Unsaved private note and scorecard edits were restored to the last saved state.'
    });
  }, [
    addToast,
    recordCandidateAnalyticsForApplication,
    selectedCandidate,
    selectedCandidateReviewDraftState,
    selectedCandidateSavedNote,
    selectedCandidateSavedScorecard,
  ]);

  const closeCandidateDetails = useCallback(() => {
    if (selectedCandidateReviewDraftState.hasUnsavedChanges) {
      addToast({
        type: 'warning',
        title: selectedCandidateReviewDraftState.summary,
        message: 'Save or reset changes before closing candidate details.'
      });
      return;
    }

    setSelectedCandidate(null);
    setIsCandidateReviewResetOpen(false);
  }, [addToast, selectedCandidateReviewDraftState]);

  const toggleCandidateSelection = (candidateId: string, selected: boolean) => {
    setSelectedCandidateIds(currentIds => {
      if (selected) {
        return currentIds.includes(candidateId) ? currentIds : [...currentIds, candidateId];
      }

      return currentIds.filter(id => id !== candidateId);
    });
    setBulkStatusError(null);
  };

  const toggleVisibleCandidateSelection = (selected: boolean) => {
    const visibleIds = filtered.map(candidate => candidate.id);
    setSelectedCandidateIds(currentIds => {
      if (!selected) {
        const visibleIdSet = new Set(visibleIds);
        return currentIds.filter(id => !visibleIdSet.has(id));
      }

      return [...currentIds, ...visibleIds.filter(id => !currentIds.includes(id))];
    });
    setBulkStatusError(null);
  };

  const clearCandidateSelection = () => {
    setSelectedCandidateIds([]);
    setBulkStatusError(null);
  };

  const requestBulkStatusChange = (targetStatus: CandidateBulkStatusTarget) => {
    const summary = targetStatus === 'INTERVIEW'
      ? bulkInterviewSummary
      : targetStatus === 'OFFER'
        ? bulkOfferSummary
        : bulkRejectSummary;

    setBulkStatusError(null);
    recordCandidateWorkflowAnalytics({
      userId: user?.id,
      action: 'candidate_bulk_status_reviewed',
      targetStatus,
      selectedCount: summary.selectedCount,
      eligibleCount: summary.eligible.length,
      skippedCount: summary.skipped.length,
      visibleCount: filtered.length,
    });
    setBulkStatusTarget(targetStatus);
  };

  const confirmBulkStatusChange = async () => {
    if (!user?.id || !bulkStatusTarget || activeBulkStatusCandidates.length === 0) return;

    setBulkUpdating(true);
    setBulkStatusError(null);
    const bulkStatusCopy = getBulkStatusChangeCopy(bulkStatusTarget);

    const succeeded: Application[] = [];
    const failed: Application[] = [];

    for (const candidate of activeBulkStatusCandidates) {
      try {
        const updated = await recruiterService.updateApplicationStatus(candidate.id, bulkStatusTarget, {
          changedBy: user.id,
          previousStatus: candidate.status,
          reason: bulkStatusCopy.reason,
        });

        succeeded.push({
          ...candidate,
          status: updated.status,
          updatedAt: updated.updatedAt,
        });
      } catch (error) {
        console.error('Failed to bulk update candidate status:', error);
        failed.push(candidate);
      }
    }

    if (succeeded.length > 0) {
      const succeededById = new Map(succeeded.map(candidate => [candidate.id, candidate]));
      const succeededIds = new Set(succeededById.keys());

      setCandidates(currentCandidates => currentCandidates.map(candidate => (
        succeededById.has(candidate.id)
          ? { ...candidate, status: succeededById.get(candidate.id)!.status, updatedAt: succeededById.get(candidate.id)!.updatedAt }
          : candidate
      )));
      setSelectedCandidate(currentCandidate => {
        if (!currentCandidate || !succeededById.has(currentCandidate.id)) return currentCandidate;
        const updatedCandidate = succeededById.get(currentCandidate.id)!;
        return { ...currentCandidate, status: updatedCandidate.status, updatedAt: updatedCandidate.updatedAt };
      });
      setSelectedCandidateIds(currentIds => currentIds.filter(id => !succeededIds.has(id)));
    }

    setBulkUpdating(false);

    if (succeeded.length > 0) {
      recordCandidateWorkflowAnalytics({
        userId: user.id,
        action: 'candidate_bulk_status_confirmed',
        targetStatus: bulkStatusTarget,
        selectedCount: activeBulkStatusSummary.selectedCount,
        eligibleCount: activeBulkStatusSummary.eligible.length,
        skippedCount: activeBulkStatusSummary.skipped.length,
        succeededCount: succeeded.length,
        failedCount: failed.length,
      });
    }

    if (failed.length > 0) {
      recordCandidateWorkflowAnalytics({
        userId: user.id,
        action: 'candidate_bulk_status_failed',
        targetStatus: bulkStatusTarget,
        selectedCount: activeBulkStatusSummary.selectedCount,
        eligibleCount: activeBulkStatusSummary.eligible.length,
        skippedCount: activeBulkStatusSummary.skipped.length,
        succeededCount: succeeded.length,
        failedCount: failed.length,
        errorCategory: succeeded.length > 0 ? 'partial_failure' : 'all_failed',
      });
    }

    if (failed.length > 0) {
      setBulkStatusError(`${failed.length} selected application${failed.length === 1 ? '' : 's'} could not be moved to ${bulkStatusTarget}. Successful updates were saved.`);
      addToast({
        type: 'warning',
        title: 'Bulk update partially saved',
        message: `${succeeded.length} moved to ${bulkStatusTarget}; ${failed.length} still need review.`,
      });
      return;
    }

    setBulkStatusTarget(null);
    addToast({
      type: 'success',
      title: 'Selected candidates moved',
      message: `${succeeded.length} application${succeeded.length === 1 ? '' : 's'} moved to ${bulkStatusTarget}.`,
    });
  };

  const isSearchingCandidates = Boolean(normalizedSearchTerm);
  const hasExactCandidateTotal = candidateTotal !== null;
  const candidateTotalPages = hasExactCandidateTotal
    ? Math.max(1, Math.ceil(candidateTotal / candidatePageSize))
    : Math.max(1, candidatePage + (candidateHasNext ? 1 : 0));
  const normalizedCandidatePage = hasExactCandidateTotal
    ? Math.min(Math.max(1, candidatePage), candidateTotalPages)
    : Math.max(1, candidatePage);
  const candidateOffset = (normalizedCandidatePage - 1) * candidatePageSize;
  const firstCandidateIndex = filtered.length === 0 ? 0 : candidateOffset + 1;
  const lastCandidateIndex = filtered.length === 0
    ? 0
    : hasExactCandidateTotal
      ? Math.min(candidateTotal, candidateOffset + filtered.length)
      : candidateOffset + filtered.length;
  const canGoToPreviousCandidatePage = normalizedCandidatePage > 1;
  const canGoToNextCandidatePage = Boolean(candidateHasNext) && (
    hasExactCandidateTotal ? normalizedCandidatePage < candidateTotalPages : true
  );
  const shouldShowCandidateControls = !loading && (filtered.length > 0 || candidateReviewFocus !== 'all');

  useEffect(() => {
    if (!hasExactCandidateTotal) return;

    setCandidatePage(currentPage => {
      const nextPage = Math.min(Math.max(1, currentPage), candidateTotalPages);
      return nextPage === currentPage ? currentPage : nextPage;
    });
  }, [candidateTotalPages, hasExactCandidateTotal]);

  const pendingStatusCopy = getStatusChangeCopy(pendingStatusChange?.status);
  const activeBulkStatusCopy = getBulkStatusChangeCopy(bulkStatusTarget || undefined);
  const selectedCandidateAdvisorySignal = selectedCandidate ? candidateAdvisorySignals[selectedCandidate.id] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="Manage and review job applications."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchCandidates()}>
              <RefreshCw size={14} className="mr-2" /> Refresh
            </Button>
            <Button size="sm">
              <Filter size={14} className="mr-2" /> Filter
            </Button>
          </div>
        }
      />

      <Card className="space-y-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <input
            type="text"
            aria-label="Search candidates"
            placeholder="Search candidates by name or position..."
            className="h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] pl-10 pr-4 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCandidatePage(1);
            }}
          />
        </div>

        {shouldShowCandidateControls && (
          <div className={`${candidatePanelClassName} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
            <p role="status" aria-live="polite" className="text-xs text-[var(--text-secondary)]">
              Showing <span className="font-medium text-[var(--text-primary)]">{firstCandidateIndex}-{lastCandidateIndex}</span>
              {hasExactCandidateTotal ? (
                <>
                  {' '}of <span className="font-medium text-[var(--text-primary)]">{candidateTotal}</span>
                </>
              ) : null}
              {' '}{isSearchingCandidates ? 'matching candidates' : 'candidates'}
              {candidateReviewFocus !== 'all' ? ' in focus' : ''}
              {visibleHighSignalCount > 0 ? (
                <>
                  {' '}· <span className="font-medium text-[var(--text-primary)]">{visibleHighSignalCount}</span> high signal
                </>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="candidate-review-focus" className="text-xs font-medium text-[var(--text-secondary)]">Focus</label>
              <select
                id="candidate-review-focus"
                aria-label="Focus candidates"
                className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                value={candidateReviewFocus}
                onChange={(event) => applyCandidateReviewFocus(event.target.value as CandidateReviewFocus)}
              >
                {candidateReviewFocusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <label htmlFor="candidate-sort-mode" className="text-xs font-medium text-[var(--text-secondary)]">Sort</label>
              <select
                id="candidate-sort-mode"
                aria-label="Sort candidates"
                className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                value={candidateSortMode}
                onChange={(event) => setCandidateSortMode(event.target.value as CandidateSortMode)}
              >
                {candidateSortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <label htmlFor="candidate-page-size" className="text-xs font-medium text-[var(--text-secondary)]">Per page</label>
              <select
                id="candidate-page-size"
                aria-label="Candidates per page"
                className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                value={candidatePageSize}
                onChange={(event) => {
                  setCandidatePageSize(Number(event.target.value));
                  setCandidatePage(1);
                }}
              >
                {candidatePageSizeOptions.map(pageSize => (
                  <option key={pageSize} value={pageSize}>{pageSize}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCandidatePage(Math.max(1, normalizedCandidatePage - 1))}
                  disabled={!canGoToPreviousCandidatePage}
                  aria-label="Previous candidates page"
                >
                  <ChevronLeft size={14} />
                </Button>
                <span className="min-w-16 text-center text-xs text-[var(--text-secondary)]">
                  Page {normalizedCandidatePage}{hasExactCandidateTotal ? ` of ${candidateTotalPages}` : ''}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCandidatePage(Math.min(candidateTotalPages, normalizedCandidatePage + 1))}
                  disabled={!canGoToNextCandidatePage}
                  aria-label="Next candidates page"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className={candidateMetricCardClassName}>
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)]">Scorecard Coverage</p>
              <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                {visibleScorecardAnalytics.scoredCount}/{visibleScorecardAnalytics.totalCount}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {visibleScorecardAnalytics.coveragePercent}% reviewed
              </p>
            </div>
            {candidateReviewFocus === 'all' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => applyCandidateReviewFocus('needs_scorecard')}
                disabled={reviewGapsFocusAction?.disabled}
                aria-label={`Review ${reviewGapsFocusAction?.count || 0} candidates without scorecards`}
              >
                <ClipboardCheck size={14} />
                {reviewGapsFocusAction?.label || 'Review gaps'}
              </Button>
            )}
          </div>
          <div className={candidateMetricCardClassName}>
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)]">Average Rubric</p>
              <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                {visibleScorecardAnalytics.averageScore === null ? 'N/A' : `${visibleScorecardAnalytics.averageScore}/5`}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {visibleScorecardAnalytics.strongSignalCount} strong signal
              </p>
            </div>
            {candidateReviewFocus === 'all' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => applyCandidateReviewFocus('high_signal')}
                disabled={reviewHighSignalFocusAction?.disabled}
                aria-label={`Review ${reviewHighSignalFocusAction?.count || 0} high-signal candidates`}
              >
                <TrendingUp size={14} />
                {reviewHighSignalFocusAction?.label || 'Review high signal'}
              </Button>
            )}
          </div>
          <div className={candidateMetricCardClassName}>
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)]">Evidence Gaps</p>
              <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                {visibleScorecardAnalytics.needsEvidenceCount}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {visibleScorecardAnalytics.unscoredCount} without scorecards
              </p>
            </div>
          </div>
          <div className={candidateMetricCardClassName}>
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)]">Scorecard Sync</p>
              <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                {visibleScorecardAnalytics.syncedCount} synced
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {visibleScorecardAnalytics.localCount} local
              </p>
            </div>
            {candidateReviewFocus !== 'all' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => applyCandidateReviewFocus('all')}
                disabled={showAllFocusAction?.disabled}
                aria-label="Show all candidates on the current page"
              >
                <Filter size={14} />
                {showAllFocusAction?.label || 'Show all'}
              </Button>
            )}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className={`${candidatePanelClassName} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openFirstCandidateInReviewQueue}
              disabled={candidateReviewQueueAction.disabled}
              aria-label={candidateReviewQueueAction.description}
              title={candidateReviewQueueAction.description}
            >
              <Eye size={14} />
              {candidateReviewQueueAction.label}
            </Button>
            <label htmlFor="select-visible-candidates" className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <input
                id="select-visible-candidates"
                type="checkbox"
                checked={allVisibleCandidatesSelected}
                onChange={(event) => toggleVisibleCandidateSelection(event.target.checked)}
                className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-primary)] text-accent focus:ring-accent"
              />
              Select visible
            </label>
            <span role="status" aria-live="polite" className="text-xs text-[var(--text-secondary)]">
              {selectedCandidates.length} selected
            </span>
            {selectedCandidates.length > 0 && (
              <span className="text-xs text-[var(--text-muted)]">
                {bulkInterviewSummary.eligible.length} Interview-ready · {bulkOfferSummary.eligible.length} Offer-ready · {bulkRejectSummary.eligible.length} Reject-ready
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearCandidateSelection}
              disabled={selectedCandidates.length === 0 || bulkUpdating}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => requestBulkStatusChange('INTERVIEW')}
              disabled={bulkInterviewSummary.eligible.length === 0 || bulkUpdating}
            >
              <CheckSquare size={14} className="mr-1.5" />
              Review Interview Move
            </Button>
            <Button
              type="button"
              size="sm"
              className={candidateOfferButtonClassName}
              onClick={() => requestBulkStatusChange('OFFER')}
              disabled={bulkOfferSummary.eligible.length === 0 || bulkUpdating}
            >
              <CheckCircle size={14} className="mr-1.5" />
              Review Offer Move
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={candidateDangerButtonClassName}
              onClick={() => requestBulkStatusChange('REJECTED')}
              disabled={bulkRejectSummary.eligible.length === 0 || bulkUpdating}
            >
              <XCircle size={14} className="mr-1.5" />
              Review Rejection
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No candidates found"
          description={candidateReviewFocus !== 'all'
            ? 'No candidates on this page match the current review focus. Change Focus to All visible or move to another page.'
            : searchTerm
              ? "We couldn't find any applications matching your search."
              : "No applications have been submitted yet. Post a job to attract candidates."}
          action={candidateReviewFocus !== 'all'
            ? { label: 'Show all candidates', onClick: () => applyCandidateReviewFocus('all') }
            : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((candidate) => {
            const advisorySignal = candidateAdvisorySignals[candidate.id];

            return (
            <Card key={candidate.id} className={candidateRecordCardClassName}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <label className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
                  <span className="sr-only">Select {candidate.user?.fullName || 'candidate'} for bulk action</span>
                  <input
                    type="checkbox"
                    checked={selectedCandidateSet.has(candidate.id)}
                    onChange={(event) => toggleCandidateSelection(candidate.id, event.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-primary)] text-accent focus:ring-accent"
                    aria-label={`Select ${candidate.user?.fullName || 'candidate'} for bulk action`}
                  />
                </label>
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                  <User size={24} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="truncate font-semibold text-[var(--text-primary)] transition-colors group-hover:text-accent">
                      {candidate.user?.fullName || 'Anonymous Candidate'}
                    </h3>
                    <Badge variant={statusVariant(candidate.status) as any}>
                      {candidate.status || 'PENDING'}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {candidate.job?.title || `Job #${candidate.jobId}`} ·{' '}
                    {candidate.appliedAt
                      ? new Date(candidate.appliedAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail size={12} /> {candidate.user?.email || 'N/A'}
                    </span>
                    {candidate.resumeUrl && (
                      <a
                        href={candidate.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-accent hover:underline"
                      >
                        <Download size={12} /> Resume
                      </a>
                    )}
                    {candidateNotes[candidate.id]?.note && (
                      <span className="flex items-center gap-1 text-warning">
                        <StickyNote size={12} /> Note saved
                      </span>
                    )}
                    {candidateScorecards[candidate.id] && (
                      <span className="flex items-center gap-1 text-success">
                        <ClipboardCheck size={12} /> Scorecard saved
                      </span>
                    )}
                    {advisorySignal && (
                      <span className="flex items-center gap-1 text-accent">
                        <TrendingUp size={12} /> {advisorySignal.label} · {advisorySignal.score}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 md:flex-none"
                  onClick={() => {
                    recordCandidateAnalyticsForApplication('candidate_details_opened', candidate, {
                      entryPoint: 'row',
                      reviewFocus: candidateReviewFocus,
                    });
                    setSelectedCandidate(candidate);
                  }}
                >
                  <Eye size={14} className="mr-1.5" /> Details
                </Button>

                {canMoveCandidateToInterview(candidate.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 md:flex-none"
                    disabled={bulkUpdating || updatingId === candidate.id}
                    onClick={() => requestStatusChange(candidate, 'INTERVIEW')}
                  >
                    <Calendar size={14} className="mr-1.5" />
                    {updatingId === candidate.id ? '...' : 'Interview'}
                  </Button>
                )}

                {candidate.status !== 'OFFER' && (
                  <Button
                    size="sm"
                    className={`${candidateOfferButtonClassName} flex-1 md:flex-none`}
                    disabled={bulkUpdating || updatingId === candidate.id}
                    onClick={() => requestStatusChange(candidate, 'OFFER')}
                  >
                    <CheckCircle size={14} className="mr-1.5" />
                    {updatingId === candidate.id ? '...' : 'Offer'}
                  </Button>
                )}

                {candidate.status !== 'REJECTED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${candidateDangerButtonClassName} flex-1 md:flex-none`}
                    disabled={bulkUpdating || updatingId === candidate.id}
                    onClick={() => requestStatusChange(candidate, 'REJECTED')}
                  >
                    <XCircle size={14} className="mr-1.5" />
                    {updatingId === candidate.id ? '...' : 'Reject'}
                  </Button>
                )}
              </div>
            </Card>
            );
          })}
        </div>
      )}

      <AuraModal
        isOpen={Boolean(selectedCandidate)}
        onClose={closeCandidateDetails}
        title="Candidate Details"
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {selectedCandidate && (
              <>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/profile/${selectedCandidate.userId}`, '_blank')}
                >
                  <ExternalLink size={14} className="mr-1.5" /> Open Profile
                </Button>
                {canMoveCandidateToInterview(selectedCandidate.status) && (
                  <Button
                    variant="outline"
                    disabled={bulkUpdating || updatingId === selectedCandidate.id}
                    onClick={() => requestStatusChange(selectedCandidate, 'INTERVIEW')}
                  >
                    <Calendar size={14} className="mr-1.5" />
                    Interview
                  </Button>
                )}
                {selectedCandidate.status !== 'OFFER' && (
                  <Button
                    className={candidateOfferButtonClassName}
                    disabled={bulkUpdating || updatingId === selectedCandidate.id}
                    onClick={() => requestStatusChange(selectedCandidate, 'OFFER')}
                  >
                    <CheckCircle size={14} className="mr-1.5" />
                    Offer
                  </Button>
                )}
                {selectedCandidate.status !== 'REJECTED' && (
                  <Button
                    variant="outline"
                    className={candidateDangerButtonClassName}
                    disabled={bulkUpdating || updatingId === selectedCandidate.id}
                    onClick={() => requestStatusChange(selectedCandidate, 'REJECTED')}
                  >
                    <XCircle size={14} className="mr-1.5" />
                    Reject
                  </Button>
                )}
              </>
            )}
          </div>
        }
      >
        {selectedCandidate && (
          <div className="space-y-6">
            <div className={`${candidatePanelClassName} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                {selectedCandidateReviewNavigation.label}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openCandidateInReviewQueue(selectedCandidateReviewNavigation.previousCandidateId, 'queue_previous')}
                  disabled={!selectedCandidateReviewNavigation.previousCandidateId || selectedCandidateReviewDraftState.hasUnsavedChanges}
                  aria-label={selectedCandidateReviewDraftState.hasUnsavedChanges
                    ? 'Save or reset review changes before moving to the previous candidate'
                    : 'Review previous candidate in current queue'}
                >
                  <ChevronLeft size={14} />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openCandidateInReviewQueue(selectedCandidateReviewNavigation.nextCandidateId, 'queue_next')}
                  disabled={!selectedCandidateReviewNavigation.nextCandidateId || selectedCandidateReviewDraftState.hasUnsavedChanges}
                  aria-label={selectedCandidateReviewDraftState.hasUnsavedChanges
                    ? 'Save or reset review changes before moving to the next candidate'
                    : 'Review next candidate in current queue'}
                >
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
            {selectedCandidateReviewDraftState.hasUnsavedChanges && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{selectedCandidateReviewDraftState.summary}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Save or reset these private review edits before closing details or moving to another candidate.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidateReviewDraftState.hasUnsavedNote && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSaveNote}
                        isLoading={savingNoteId === selectedCandidate.id}
                      >
                        <Save size={14} />
                        Save Note
                      </Button>
                    )}
                    {selectedCandidateReviewDraftState.hasUnsavedScorecard && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={saveCandidateScorecard}
                        isLoading={savingScorecardId === selectedCandidate.id}
                      >
                        <ClipboardCheck size={14} />
                        Save Scorecard
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={openCandidateReviewResetReview}
                    >
                      <RefreshCw size={14} />
                      Reset Changes
                    </Button>
                  </div>
                </div>
                {isCandidateReviewResetOpen && (
                  <div role="alert" className="mt-4 rounded-lg border border-warning/30 bg-[var(--bg-primary)]/60 p-3">
                    <p className="text-sm font-medium text-[var(--text-primary)]">Reset unsaved private review edits?</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      This restores the private note and scorecard drafts to the last saved state for this candidate. It does not save notes, change status, send messages, schedule interviews, or contact the candidate.
                    </p>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={cancelCandidateReviewResetReview}>
                        Keep Changes
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={confirmCandidateReviewReset}>
                        <RefreshCw size={14} />
                        Reset Drafts
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <User size={26} />
              </div>
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {selectedCandidate.user?.fullName || 'Anonymous Candidate'}
                  </h3>
                  <Badge variant={statusVariant(selectedCandidate.status) as any}>
                    {selectedCandidate.status || 'PENDING'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <Mail size={14} /> {selectedCandidate.user?.email || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase size={14} /> {selectedCandidate.job?.title || `Job #${selectedCandidate.jobId}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> Applied {formatCandidateDate(selectedCandidate.appliedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={candidateReviewSectionClassName}>
                <p className="text-xs text-[var(--text-muted)]">Application ID</p>
                <p className="text-sm font-medium break-all">{selectedCandidate.id}</p>
              </div>
              <div className={candidateReviewSectionClassName}>
                <p className="text-xs text-[var(--text-muted)]">Job ID</p>
                <p className="text-sm font-medium break-all">{selectedCandidate.jobId}</p>
              </div>
              <div className={candidateReviewSectionClassName}>
                <p className="text-xs text-[var(--text-muted)]">Last Updated</p>
                <p className="text-sm font-medium">{formatCandidateDate(selectedCandidate.updatedAt || selectedCandidate.appliedAt)}</p>
              </div>
            </div>

            {selectedCandidateAdvisorySignal && (
              <div className={`${candidateReviewSectionClassName} space-y-3`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <TrendingUp size={15} className="text-accent" />
                      Advisory Signal
                    </h4>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {selectedCandidateAdvisorySignal.action}
                    </p>
                  </div>
                  <div className={`${candidateInsetClassName} text-sm`}>
                    <p className="text-xs text-[var(--text-muted)]">Review priority</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {selectedCandidateAdvisorySignal.label} · {selectedCandidateAdvisorySignal.score}/100
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-muted)]">Factors</p>
                    <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
                      {selectedCandidateAdvisorySignal.factors.map(factor => (
                        <li key={factor} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-muted)]">Safeguards</p>
                    <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
                      {selectedCandidateAdvisorySignal.safeguards.map(safeguard => (
                        <li key={safeguard} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                          <span>{safeguard}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Submitted Materials</h4>
              {selectedCandidate.resumeUrl ? (
                <a
                  href={selectedCandidate.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                >
                  <Download size={14} /> Resume
                </a>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No resume link was submitted.</p>
              )}
              {selectedCandidate.coverLetter ? (
                <div className={candidateReviewSectionClassName}>
                  <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Cover Letter</p>
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{selectedCandidate.coverLetter}</p>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No cover letter was submitted.</p>
              )}
            </div>

            <div className={`${candidateReviewSectionClassName} space-y-2`}>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Review Guidance</h4>
              <p className="text-sm text-[var(--text-secondary)]">
                Review submitted materials and profile context before changing status. Status changes are visible in the candidate's application timeline.
              </p>
            </div>

            {selectedInterviewPlan && canDraftCandidateInterviewPlan(selectedCandidate.status) && (
              <div className={`${candidateReviewSectionClassName} space-y-3`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <Calendar size={15} className="text-accent" />
                      Interview Plan
                    </h4>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Suggested slots and prep notes are drafts only. Review before saving notes or changing status.
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={insertInterviewPlanIntoNotes}>
                    <StickyNote size={14} className="mr-1.5" />
                    Use in Notes
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {selectedInterviewPlan.suggestedSlots.map(slot => (
                    <div key={slot.id} className={candidateInsetClassName}>
                      <p className="text-xs text-[var(--text-muted)]">Suggested slot</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{slot.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  This does not send a message, schedule a video session, or update the candidate until you explicitly save notes or confirm a status change.
                </p>
              </div>
            )}

            {selectedScorecardSummary && (
              <div className={`${candidateReviewSectionClassName} space-y-4`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <ClipboardCheck size={15} className="text-success" />
                      Candidate Scorecard
                    </h4>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Advisory ratings for structured review. Save or add to private notes before changing status.
                    </p>
                  </div>
                  <div className={`${candidateInsetClassName} text-sm`}>
                    <p className="text-xs text-[var(--text-muted)]">Overall signal</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {selectedScorecardSummary.recommendationLabel} · {selectedScorecardSummary.averageScore}/5
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {candidateScorecardDimensions.map(dimension => (
                    <div key={dimension.key} className={candidateInsetClassName}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <label htmlFor={`scorecard-${dimension.key}`} className="text-sm font-medium text-[var(--text-primary)]">
                            {dimension.label}
                          </label>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">{dimension.description}</p>
                        </div>
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                          {scorecardRatings[dimension.key]}/5
                        </span>
                      </div>
                      <input
                        id={`scorecard-${dimension.key}`}
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={scorecardRatings[dimension.key]}
                        onChange={(event) => updateScorecardRating(dimension.key, event.target.value)}
                        className="mt-3 w-full accent-[var(--color-accent)]"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label htmlFor="candidate-scorecard-evidence" className="text-sm font-medium text-[var(--text-primary)]">
                    Evidence notes
                  </label>
                  <textarea
                    id="candidate-scorecard-evidence"
                    value={scorecardEvidence}
                    onChange={(event) => {
                      setIsCandidateReviewResetOpen(false);
                      setScorecardEvidence(event.target.value);
                    }}
                    rows={3}
                    className="mt-2 w-full resize-y rounded-lg border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                    placeholder="Summarize evidence from resume, cover letter, interview notes, or portfolio..."
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[var(--text-muted)]">
                    {candidateScorecards[selectedCandidate.id]?.updatedAt
                      ? `Saved ${formatCandidateDate(candidateScorecards[selectedCandidate.id].updatedAt)}${candidateScorecards[selectedCandidate.id].source === 'server' ? ' · synced' : ' · local'}`
                      : 'Not saved yet'}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" size="sm" variant="outline" onClick={insertScorecardIntoNotes}>
                      <StickyNote size={14} className="mr-1.5" />
                      Use in Notes
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={saveCandidateScorecard}
                      isLoading={savingScorecardId === selectedCandidate.id}
                    >
                      <Save size={14} className="mr-1.5" />
                      Save Scorecard
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-muted)]">
                  This does not change status, send messages, schedule interviews, create notifications, or contact the candidate.
                </p>
              </div>
            )}

            <div className={`${candidateReviewSectionClassName} space-y-3`}>
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <StickyNote size={15} className="text-warning" />
                  Recruiter Notes
                </h4>
                {candidateNotes[selectedCandidate.id]?.updatedAt && (
                  <span className="text-xs text-[var(--text-muted)]">
                    Saved {formatCandidateDate(candidateNotes[selectedCandidate.id].updatedAt)}
                  </span>
                )}
              </div>
              <textarea
                value={draftNote}
                onChange={(event) => {
                  setIsCandidateReviewResetOpen(false);
                  setDraftNote(event.target.value);
                }}
                rows={4}
                className="w-full resize-y rounded-lg border border-[var(--border-default)] bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                placeholder="Add private screening notes, follow-up questions, or interview context..."
                aria-label="Private recruiter notes"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveNote}
                  isLoading={savingNoteId === selectedCandidate.id}
                >
                  <Save size={14} className="mr-1.5" />
                  Save Note
                </Button>
              </div>
            </div>
          </div>
        )}
      </AuraModal>

      <AuraModal
        isOpen={Boolean(pendingStatusChange)}
        onClose={() => {
          if (updatingId || bulkUpdating) return;
          setStatusChangeError(null);
          setPendingStatusChange(null);
        }}
        title={pendingStatusCopy.title}
        size="sm"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => {
                setStatusChangeError(null);
                setPendingStatusChange(null);
              }}
              disabled={Boolean(updatingId || bulkUpdating)}
            >
              Cancel
            </Button>
            <Button
              variant={pendingStatusChange?.status === 'REJECTED' ? 'destructive' : 'default'}
              onClick={confirmStatusChange}
              isLoading={Boolean(pendingStatusChange && updatingId === pendingStatusChange.candidate.id)}
              disabled={bulkUpdating}
            >
              {pendingStatusChange?.status === 'OFFER' ? (
                <CheckCircle size={14} className="mr-1.5" />
              ) : pendingStatusChange?.status === 'INTERVIEW' ? (
                <Calendar size={14} className="mr-1.5" />
              ) : (
                <XCircle size={14} className="mr-1.5" />
              )}
              {pendingStatusCopy.confirmLabel}
            </Button>
          </div>
        }
      >
        {pendingStatusChange && (
          <div className="space-y-4">
            <div className={`${candidateReviewSectionClassName} flex items-start gap-3`}>
              {pendingStatusChange.status === 'OFFER' ? (
                <CheckCircle size={18} className="mt-0.5 text-success" />
              ) : pendingStatusChange.status === 'INTERVIEW' ? (
                <Calendar size={18} className="mt-0.5 text-accent" />
              ) : (
                <AlertTriangle size={18} className="mt-0.5 text-destructive" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {pendingStatusCopy.heading}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  This updates the candidate application status and may appear in the candidate's application timeline.
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-[var(--text-muted)]">Candidate</dt>
                <dd className="mt-1 font-medium text-[var(--text-primary)]">
                  {pendingStatusChange.candidate.user?.fullName || 'Anonymous Candidate'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[var(--text-muted)]">Role</dt>
                <dd className="mt-1 text-[var(--text-secondary)]">
                  {pendingStatusChange.candidate.job?.title || `Job #${pendingStatusChange.candidate.jobId}`}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs font-medium text-[var(--text-muted)]">Current</dt>
                  <dd className="mt-1">
                    <Badge variant={statusVariant(pendingStatusChange.candidate.status) as any}>
                      {pendingStatusChange.candidate.status || 'PENDING'}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--text-muted)]">New</dt>
                  <dd className="mt-1">
                    <Badge variant={statusVariant(pendingStatusChange.status) as any}>
                      {pendingStatusChange.status}
                    </Badge>
                  </dd>
                </div>
              </div>
            </dl>

            {statusChangeError && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {statusChangeError}
              </p>
            )}
          </div>
        )}
      </AuraModal>

      <AuraModal
        isOpen={Boolean(bulkStatusTarget)}
        onClose={() => {
          if (bulkUpdating) return;
          setBulkStatusError(null);
          setBulkStatusTarget(null);
        }}
        title={activeBulkStatusCopy.title}
        size="lg"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => {
                setBulkStatusError(null);
                setBulkStatusTarget(null);
              }}
              disabled={bulkUpdating}
            >
              Cancel
            </Button>
            <Button
              variant={bulkStatusTarget === 'REJECTED' ? 'destructive' : 'default'}
              className={bulkStatusTarget === 'OFFER' ? candidateOfferButtonClassName : undefined}
              onClick={confirmBulkStatusChange}
              isLoading={bulkUpdating}
              disabled={activeBulkStatusCandidates.length === 0}
            >
              {bulkStatusTarget === 'OFFER' ? (
                <CheckCircle size={14} className="mr-1.5" />
              ) : bulkStatusTarget === 'REJECTED' ? (
                <XCircle size={14} className="mr-1.5" />
              ) : (
                <Calendar size={14} className="mr-1.5" />
              )}
              {activeBulkStatusCopy.confirmLabel} ({activeBulkStatusCandidates.length})
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className={`${candidateReviewSectionClassName} flex items-start gap-3`}>
            {bulkStatusTarget === 'OFFER' ? (
              <CheckCircle size={18} className="mt-0.5 text-success" />
            ) : bulkStatusTarget === 'REJECTED' ? (
              <AlertTriangle size={18} className="mt-0.5 text-destructive" />
            ) : (
              <Calendar size={18} className="mt-0.5 text-accent" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {activeBulkStatusCopy.heading}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {activeBulkStatusCopy.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className={candidateReviewSectionClassName}>
              <p className="text-xs text-[var(--text-muted)]">Selected</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{activeBulkStatusSummary.selectedCount}</p>
            </div>
            <div className={candidateReviewSectionClassName}>
              <p className="text-xs text-[var(--text-muted)]">Will Update</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{activeBulkStatusCandidates.length}</p>
            </div>
            <div className={candidateReviewSectionClassName}>
              <p className="text-xs text-[var(--text-muted)]">Skipped</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">{activeBulkStatusSummary.skipped.length}</p>
            </div>
          </div>

          {activeBulkStatusSummary.eligible.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Eligible Applications</h4>
              <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {activeBulkStatusSummary.eligible.map(candidate => (
                  <li key={candidate.id} className={`${candidateInsetClassName} p-3`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {candidate.candidateName}
                        </p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">
                          {candidate.roleTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant(candidate.status || 'PENDING') as any}>
                          {candidate.status || 'PENDING'}
                        </Badge>
                        <span className="text-xs text-[var(--text-muted)]">to</span>
                        <Badge variant={statusVariant(bulkStatusTarget || 'INTERVIEW') as any}>
                          {bulkStatusTarget || 'INTERVIEW'}
                        </Badge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeBulkStatusSummary.skipped.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Skipped Applications</h4>
              <ul className="space-y-2">
                {activeBulkStatusSummary.skipped.map(candidate => (
                  <li key={candidate.id} className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {candidate.candidateName}
                        </p>
                        <p className="truncate text-xs text-[var(--text-secondary)]">
                          {candidate.roleTitle}
                        </p>
                        {candidate.skipReason && (
                          <p className="mt-1 text-xs text-warning">{candidate.skipReason}</p>
                        )}
                      </div>
                      <Badge variant={statusVariant(candidate.status || 'PENDING') as any}>
                        {candidate.status || 'PENDING'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bulkStatusError && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {bulkStatusError}
            </p>
          )}
        </div>
      </AuraModal>
    </div>
  );
};

export default CandidatesPage;
