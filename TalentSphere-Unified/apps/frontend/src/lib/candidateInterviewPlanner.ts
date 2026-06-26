export interface CandidateInterviewPlanInput {
  candidateName?: string;
  candidateEmail?: string;
  roleTitle?: string;
  appliedAt?: string;
  now?: Date;
}

export interface CandidateInterviewSlot {
  id: string;
  label: string;
  iso: string;
}

export interface CandidateInterviewPlan {
  candidateName: string;
  roleTitle: string;
  candidateEmail?: string;
  suggestedSlots: CandidateInterviewSlot[];
  noteDraft: string;
}

export interface CandidateBulkStatusItem {
  id: string;
  status?: string;
  candidateName?: string;
  roleTitle?: string;
  skipReason?: string;
}

export type CandidateBulkStatusTarget = 'INTERVIEW' | 'OFFER' | 'REJECTED';

export interface CandidateBulkStatusSummary {
  targetStatus: CandidateBulkStatusTarget;
  selectedCount: number;
  eligible: CandidateBulkStatusItem[];
  skipped: CandidateBulkStatusItem[];
}

export type CandidateScorecardDimension = 'role_fit' | 'technical_depth' | 'communication' | 'execution';

export interface CandidateScorecardDimensionOption {
  key: CandidateScorecardDimension;
  label: string;
  description: string;
}

export type CandidateScorecardRatings = Record<CandidateScorecardDimension, number>;

export interface CandidateScorecardSummaryInput {
  candidateName?: string;
  roleTitle?: string;
  ratings: Partial<Record<CandidateScorecardDimension, unknown>>;
  evidence?: string;
}

export interface CandidateScorecardSummary {
  candidateName: string;
  roleTitle: string;
  ratings: CandidateScorecardRatings;
  averageScore: number;
  recommendationLabel: string;
  noteDraft: string;
}

export interface CandidateAdvisorySignalInput {
  status?: string;
  hasResume?: boolean;
  hasCoverLetter?: boolean;
  hasRecruiterNote?: boolean;
  scorecardAverage?: number | null;
  scorecardSource?: 'server' | 'local';
}

export interface CandidateAdvisorySignal {
  score: number;
  label: string;
  action: string;
  factors: string[];
  safeguards: string[];
}

export interface CandidateScorecardAnalyticsItem {
  id: string;
  scorecardAverage?: number | null;
  source?: 'server' | 'local';
}

export interface CandidateScorecardAnalytics {
  totalCount: number;
  scoredCount: number;
  unscoredCount: number;
  coveragePercent: number;
  averageScore: number | null;
  strongSignalCount: number;
  needsEvidenceCount: number;
  syncedCount: number;
  localCount: number;
}

export type CandidateReviewFocus = 'all' | 'needs_scorecard' | 'high_signal';

export interface CandidateReviewFocusItem {
  id: string;
  hasScorecard?: boolean;
  advisoryScore?: number | null;
}

export interface CandidateReviewFocusActionInput {
  currentFocus: CandidateReviewFocus;
  totalCount: number;
  unscoredCount: number;
  highSignalCount: number;
}

export interface CandidateReviewFocusAction {
  focus: CandidateReviewFocus;
  label: string;
  count: number;
  disabled: boolean;
}

export interface CandidateReviewQueueItem {
  id: string;
  candidateName?: string;
  roleTitle?: string;
}

export interface CandidateReviewQueueActionInput {
  focus: CandidateReviewFocus;
  candidates: CandidateReviewQueueItem[];
}

export interface CandidateReviewQueueAction {
  candidateId: string | null;
  label: string;
  description: string;
  count: number;
  disabled: boolean;
}

export interface CandidateReviewQueueNavigationInput {
  currentCandidateId?: string | null;
  candidates: CandidateReviewQueueItem[];
}

export interface CandidateReviewQueueNavigation {
  previousCandidateId: string | null;
  nextCandidateId: string | null;
  position: number;
  totalCount: number;
  label: string;
}

export interface CandidateReviewDraftStateInput {
  savedNote?: string | null;
  draftNote?: string | null;
  savedRatings?: Partial<Record<CandidateScorecardDimension, unknown>> | null;
  draftRatings: Partial<Record<CandidateScorecardDimension, unknown>>;
  savedEvidence?: string | null;
  draftEvidence?: string | null;
}

export interface CandidateReviewDraftState {
  hasUnsavedNote: boolean;
  hasUnsavedScorecard: boolean;
  hasUnsavedChanges: boolean;
  summary: string;
}

const compact = (value?: string | null) => (value || '').trim();

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const candidateScorecardDimensions: CandidateScorecardDimensionOption[] = [
  {
    key: 'role_fit',
    label: 'Role Fit',
    description: 'Experience and motivation match the role needs.',
  },
  {
    key: 'technical_depth',
    label: 'Technical Depth',
    description: 'Submitted work shows the expected skill depth.',
  },
  {
    key: 'communication',
    label: 'Communication',
    description: 'Application materials are clear and relevant.',
  },
  {
    key: 'execution',
    label: 'Execution',
    description: 'Evidence suggests reliable delivery in this role.',
  },
];

const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

const nextBusinessDay = (date: Date) => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (isWeekend(next)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

const formatSlotLabel = (date: Date) => (
  `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()} at ${String(date.getHours()).padStart(2, '0')}:00`
);

const createSlot = (baseDate: Date, hour: number): CandidateInterviewSlot => {
  const slotDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hour,
    0,
    0,
    0
  );

  return {
    id: `${slotDate.getFullYear()}-${slotDate.getMonth() + 1}-${slotDate.getDate()}-${hour}`,
    label: formatSlotLabel(slotDate),
    iso: slotDate.toISOString(),
  };
};

export const createDefaultCandidateScorecardRatings = (): CandidateScorecardRatings => (
  candidateScorecardDimensions.reduce<CandidateScorecardRatings>((acc, dimension) => {
    acc[dimension.key] = 3;
    return acc;
  }, {} as CandidateScorecardRatings)
);

export const normalizeCandidateScorecardRating = (value: unknown) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 3;
  return Math.min(5, Math.max(1, Math.round(numericValue)));
};

export const normalizeCandidateScorecardRatings = (
  ratings: Partial<Record<CandidateScorecardDimension, unknown>>
): CandidateScorecardRatings => (
  candidateScorecardDimensions.reduce<CandidateScorecardRatings>((acc, dimension) => {
    acc[dimension.key] = normalizeCandidateScorecardRating(ratings[dimension.key]);
    return acc;
  }, {} as CandidateScorecardRatings)
);

const ratingsEqual = (left: CandidateScorecardRatings, right: CandidateScorecardRatings) => (
  candidateScorecardDimensions.every(dimension => left[dimension.key] === right[dimension.key])
);

export const buildCandidateReviewDraftState = ({
  savedNote,
  draftNote,
  savedRatings,
  draftRatings,
  savedEvidence,
  draftEvidence,
}: CandidateReviewDraftStateInput): CandidateReviewDraftState => {
  const hasUnsavedNote = compact(savedNote) !== compact(draftNote);
  const normalizedSavedRatings = normalizeCandidateScorecardRatings(savedRatings || createDefaultCandidateScorecardRatings());
  const normalizedDraftRatings = normalizeCandidateScorecardRatings(draftRatings);
  const hasUnsavedScorecard = (
    !ratingsEqual(normalizedSavedRatings, normalizedDraftRatings) ||
    compact(savedEvidence) !== compact(draftEvidence)
  );
  const hasUnsavedChanges = hasUnsavedNote || hasUnsavedScorecard;
  const summary = hasUnsavedNote && hasUnsavedScorecard
    ? 'Unsaved note and scorecard changes'
    : hasUnsavedNote
      ? 'Unsaved note changes'
      : hasUnsavedScorecard
        ? 'Unsaved scorecard changes'
        : 'All review changes saved';

  return {
    hasUnsavedNote,
    hasUnsavedScorecard,
    hasUnsavedChanges,
    summary,
  };
};

const getCandidateScorecardRecommendationLabel = (averageScore: number) => {
  if (averageScore >= 4.25) return 'Strong positive signal';
  if (averageScore >= 3.5) return 'Positive signal';
  if (averageScore >= 2.5) return 'Mixed signal';
  return 'Needs more evidence';
};

export const buildCandidateScorecardSummary = ({
  candidateName,
  roleTitle,
  ratings,
  evidence,
}: CandidateScorecardSummaryInput): CandidateScorecardSummary => {
  const normalizedRatings = normalizeCandidateScorecardRatings(ratings);
  const displayName = compact(candidateName) || 'Candidate';
  const displayRole = compact(roleTitle) || 'the role';
  const evidenceText = compact(evidence);
  const scoreSum = candidateScorecardDimensions.reduce((sum, dimension) => (
    sum + normalizedRatings[dimension.key]
  ), 0);
  const averageScore = Number((scoreSum / candidateScorecardDimensions.length).toFixed(1));
  const recommendationLabel = getCandidateScorecardRecommendationLabel(averageScore);
  const noteLines = [
    `Candidate scorecard for ${displayName}`,
    `Role: ${displayRole}`,
    `Overall signal: ${recommendationLabel} (${averageScore}/5)`,
    'Ratings:',
    ...candidateScorecardDimensions.map(dimension => `- ${dimension.label}: ${normalizedRatings[dimension.key]}/5`),
    ...(evidenceText ? ['Evidence:', evidenceText] : []),
    'Control note: This scorecard is advisory and does not change application status.',
  ];

  return {
    candidateName: displayName,
    roleTitle: displayRole,
    ratings: normalizedRatings,
    averageScore,
    recommendationLabel,
    noteDraft: noteLines.join('\n'),
  };
};

const normalizeScorecardAverage = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return Math.min(5, Math.max(1, Number(numericValue.toFixed(1))));
};

export const buildCandidateAdvisorySignal = ({
  status,
  hasResume = false,
  hasCoverLetter = false,
  hasRecruiterNote = false,
  scorecardAverage,
  scorecardSource,
}: CandidateAdvisorySignalInput): CandidateAdvisorySignal => {
  const normalizedStatus = compact(status).toUpperCase() || 'PENDING';
  const normalizedAverage = normalizeScorecardAverage(scorecardAverage);
  const factors: string[] = [];
  const safeguards = [
    'Advisory only',
    'Status changes still require confirmation',
  ];
  let score = 50;

  if (normalizedAverage !== null) {
    score += Math.round((normalizedAverage - 3) * 18);
    factors.push(`Scorecard ${normalizedAverage}/5${scorecardSource ? ` (${scorecardSource})` : ''}`);
  } else {
    score -= 8;
    factors.push('No saved scorecard yet');
  }

  if (hasResume) {
    score += 8;
    factors.push('Resume available');
  } else {
    score -= 6;
    factors.push('Resume missing');
  }

  if (hasCoverLetter) {
    score += 5;
    factors.push('Cover letter submitted');
  }

  if (hasRecruiterNote) {
    score += 3;
    factors.push('Recruiter context saved');
  }

  if (normalizedStatus === 'INTERVIEW') {
    score += 7;
    factors.push('Already in Interview');
  }

  if (normalizedStatus === 'OFFER') {
    score = Math.max(score, 90);
    factors.push('Offer already sent');
    safeguards.push('Bulk Reject skips offered candidates');
  }

  if (normalizedStatus === 'REJECTED') {
    score = Math.min(score, 25);
    factors.push('Already rejected');
    safeguards.push('Final-state candidates stay unchanged unless explicitly reopened elsewhere');
  }

  const boundedScore = Math.min(100, Math.max(0, score));
  const label = boundedScore >= 80
    ? 'High signal'
    : boundedScore >= 60
      ? 'Review soon'
      : boundedScore >= 40
        ? 'Needs evidence'
        : 'Low signal';
  const action = normalizedStatus === 'OFFER'
    ? 'Offer sent; monitor follow-up'
    : normalizedStatus === 'REJECTED'
      ? 'Rejected; no action suggested'
      : normalizedAverage === null
        ? 'Complete scorecard before final decision'
        : boundedScore >= 80 && normalizedStatus === 'INTERVIEW'
          ? 'Review for Offer'
          : boundedScore >= 75
            ? 'Review for Interview'
            : boundedScore < 40
              ? 'Gather evidence before rejection'
              : 'Continue structured review';

  return {
    score: boundedScore,
    label,
    action,
    factors: factors.slice(0, 5),
    safeguards,
  };
};

export const buildCandidateScorecardAnalytics = (
  candidates: CandidateScorecardAnalyticsItem[]
): CandidateScorecardAnalytics => {
  const uniqueCandidates = candidates.reduce<CandidateScorecardAnalyticsItem[]>((acc, candidate) => {
    if (!candidate.id || acc.some(item => item.id === candidate.id)) return acc;
    acc.push(candidate);
    return acc;
  }, []);
  const scoredCandidates = uniqueCandidates
    .map(candidate => ({
      ...candidate,
      scorecardAverage: normalizeScorecardAverage(candidate.scorecardAverage),
    }))
    .filter((candidate): candidate is CandidateScorecardAnalyticsItem & { scorecardAverage: number } => (
      candidate.scorecardAverage !== null
    ));
  const scoreSum = scoredCandidates.reduce((sum, candidate) => sum + candidate.scorecardAverage, 0);
  const scoredCount = scoredCandidates.length;
  const totalCount = uniqueCandidates.length;

  return {
    totalCount,
    scoredCount,
    unscoredCount: totalCount - scoredCount,
    coveragePercent: totalCount === 0 ? 0 : Math.round((scoredCount / totalCount) * 100),
    averageScore: scoredCount === 0 ? null : Number((scoreSum / scoredCount).toFixed(1)),
    strongSignalCount: scoredCandidates.filter(candidate => candidate.scorecardAverage >= 4.25).length,
    needsEvidenceCount: scoredCandidates.filter(candidate => candidate.scorecardAverage < 2.5).length + (totalCount - scoredCount),
    syncedCount: scoredCandidates.filter(candidate => candidate.source === 'server').length,
    localCount: scoredCandidates.filter(candidate => candidate.source === 'local' || !candidate.source).length,
  };
};

export const filterCandidatesByReviewFocus = <T extends CandidateReviewFocusItem>(
  candidates: T[],
  focus: CandidateReviewFocus
): T[] => {
  const uniqueCandidates = candidates.reduce<T[]>((acc, candidate) => {
    if (!candidate.id || acc.some(item => item.id === candidate.id)) return acc;
    acc.push(candidate);
    return acc;
  }, []);

  switch (focus) {
    case 'needs_scorecard':
      return uniqueCandidates.filter(candidate => !candidate.hasScorecard);
    case 'high_signal':
      return uniqueCandidates.filter(candidate => Number(candidate.advisoryScore) >= 80);
    case 'all':
    default:
      return uniqueCandidates;
  }
};

const normalizeActionCount = (value: number) => (
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
);

export const buildCandidateReviewFocusActions = ({
  currentFocus,
  totalCount,
  unscoredCount,
  highSignalCount,
}: CandidateReviewFocusActionInput): CandidateReviewFocusAction[] => {
  const safeTotalCount = normalizeActionCount(totalCount);
  const safeUnscoredCount = normalizeActionCount(unscoredCount);
  const safeHighSignalCount = normalizeActionCount(highSignalCount);
  const isScoped = currentFocus !== 'all';

  return [
    {
      focus: 'needs_scorecard',
      label: 'Review gaps',
      count: safeUnscoredCount,
      disabled: isScoped || safeUnscoredCount === 0,
    },
    {
      focus: 'high_signal',
      label: 'Review high signal',
      count: safeHighSignalCount,
      disabled: isScoped || safeHighSignalCount === 0,
    },
    {
      focus: 'all',
      label: 'Show all',
      count: safeTotalCount,
      disabled: currentFocus === 'all' || safeTotalCount === 0,
    },
  ];
};

const candidateQueueLabel = (focus: CandidateReviewFocus, count: number) => {
  if (focus === 'all') return count === 1 ? 'visible candidate' : 'visible candidates';
  return count === 1 ? 'candidate in current focus' : 'candidates in current focus';
};

const uniqueCandidateQueueItems = (candidates: CandidateReviewQueueItem[]) => (
  candidates.reduce<CandidateReviewQueueItem[]>((acc, candidate) => {
    if (!candidate.id || acc.some(item => item.id === candidate.id)) return acc;
    acc.push(candidate);
    return acc;
  }, [])
);

export const buildCandidateReviewQueueAction = ({
  focus,
  candidates,
}: CandidateReviewQueueActionInput): CandidateReviewQueueAction => {
  const uniqueCandidates = uniqueCandidateQueueItems(candidates);
  const count = uniqueCandidates.length;
  const firstCandidate = uniqueCandidates[0];
  const label = focus === 'all' ? 'Review first visible' : 'Review first in focus';

  if (!firstCandidate) {
    return {
      candidateId: null,
      label,
      description: `No ${candidateQueueLabel(focus, 2)} to review.`,
      count: 0,
      disabled: true,
    };
  }

  const candidateName = compact(firstCandidate.candidateName) || 'first candidate';
  const roleTitle = compact(firstCandidate.roleTitle);
  const targetLabel = roleTitle ? `${candidateName} for ${roleTitle}` : candidateName;

  return {
    candidateId: firstCandidate.id,
    label,
    description: `Open ${targetLabel}. ${count} ${candidateQueueLabel(focus, count)} available.`,
    count,
    disabled: false,
  };
};

export const buildCandidateReviewQueueNavigation = ({
  currentCandidateId,
  candidates,
}: CandidateReviewQueueNavigationInput): CandidateReviewQueueNavigation => {
  const uniqueCandidates = uniqueCandidateQueueItems(candidates);
  const totalCount = uniqueCandidates.length;
  const currentIndex = currentCandidateId
    ? uniqueCandidates.findIndex(candidate => candidate.id === currentCandidateId)
    : -1;

  if (currentIndex < 0) {
    return {
      previousCandidateId: null,
      nextCandidateId: null,
      position: 0,
      totalCount,
      label: totalCount === 0 ? 'No candidates in current queue' : 'Candidate not in current queue',
    };
  }

  return {
    previousCandidateId: uniqueCandidates[currentIndex - 1]?.id || null,
    nextCandidateId: uniqueCandidates[currentIndex + 1]?.id || null,
    position: currentIndex + 1,
    totalCount,
    label: `Candidate ${currentIndex + 1} of ${totalCount} in current queue`,
  };
};

export const canDraftCandidateInterviewPlan = (status?: string) => (
  !['OFFER', 'REJECTED'].includes(compact(status).toUpperCase())
);

export const canMoveCandidateToInterview = (status?: string) => (
  !['INTERVIEW', 'OFFER', 'REJECTED'].includes(compact(status).toUpperCase())
);

export const canMoveCandidateToOffer = (status?: string) => (
  compact(status).toUpperCase() === 'INTERVIEW'
);

export const canMoveCandidateToRejected = (status?: string) => (
  !['OFFER', 'REJECTED'].includes(compact(status).toUpperCase())
);

export const canMoveCandidateToBulkStatus = (
  status: string | undefined,
  targetStatus: CandidateBulkStatusTarget
) => {
  switch (targetStatus) {
    case 'INTERVIEW':
      return canMoveCandidateToInterview(status);
    case 'OFFER':
      return canMoveCandidateToOffer(status);
    case 'REJECTED':
      return canMoveCandidateToRejected(status);
    default:
      return false;
  }
};

export const getCandidateBulkStatusSkipReason = (
  status: string | undefined,
  targetStatus: CandidateBulkStatusTarget
) => {
  const normalizedStatus = compact(status).toUpperCase() || 'PENDING';

  if (targetStatus === 'OFFER') {
    return normalizedStatus === 'INTERVIEW'
      ? ''
      : 'Only Interview candidates are eligible for bulk Offer.';
  }

  if (targetStatus === 'REJECTED' && normalizedStatus === 'OFFER') {
    return 'Offered candidates are skipped to avoid accidental offer rescinds.';
  }

  return `Already ${normalizedStatus}.`;
};

export const buildCandidateBulkStatusSummary = (
  candidates: CandidateBulkStatusItem[],
  targetStatus: CandidateBulkStatusTarget
): CandidateBulkStatusSummary => {
  const uniqueCandidates = candidates.reduce<CandidateBulkStatusItem[]>((acc, candidate) => {
    if (!candidate.id || acc.some(item => item.id === candidate.id)) return acc;

    const isEligible = canMoveCandidateToBulkStatus(candidate.status, targetStatus);
    acc.push({
      ...candidate,
      candidateName: compact(candidate.candidateName) || 'Anonymous Candidate',
      roleTitle: compact(candidate.roleTitle) || 'Unknown role',
      skipReason: isEligible ? undefined : getCandidateBulkStatusSkipReason(candidate.status, targetStatus),
    });
    return acc;
  }, []);

  return {
    targetStatus,
    selectedCount: uniqueCandidates.length,
    eligible: uniqueCandidates.filter(candidate => canMoveCandidateToBulkStatus(candidate.status, targetStatus)),
    skipped: uniqueCandidates.filter(candidate => !canMoveCandidateToBulkStatus(candidate.status, targetStatus)),
  };
};

export const buildCandidateBulkInterviewSummary = (
  candidates: CandidateBulkStatusItem[]
) => buildCandidateBulkStatusSummary(candidates, 'INTERVIEW');

export const buildCandidateInterviewPlan = ({
  candidateName,
  candidateEmail,
  roleTitle,
  now = new Date(),
}: CandidateInterviewPlanInput): CandidateInterviewPlan => {
  const displayName = compact(candidateName) || 'Candidate';
  const displayRole = compact(roleTitle) || 'the role';
  const email = compact(candidateEmail);
  const firstDay = nextBusinessDay(now);
  const secondDay = nextBusinessDay(firstDay);
  const suggestedSlots = [
    createSlot(firstDay, 10),
    createSlot(secondDay, 14),
  ];

  const noteLines = [
    `Interview plan for ${displayName}`,
    `Role: ${displayRole}`,
    ...(email ? [`Candidate contact: ${email}`] : []),
    'Suggested slots:',
    ...suggestedSlots.map(slot => `- ${slot.label}`),
    'Prep focus:',
    '- Confirm availability and interview format before scheduling.',
    '- Review submitted resume, cover letter, and profile context.',
    '- Capture scorecard notes before making an offer/reject decision.',
  ];

  return {
    candidateName: displayName,
    roleTitle: displayRole,
    candidateEmail: email || undefined,
    suggestedSlots,
    noteDraft: noteLines.join('\n'),
  };
};
