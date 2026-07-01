import { normalizeAIProvenance, type AIProvenanceMode } from './aiProvenance';

export type AISuggestionReviewStatus = 'draft' | 'saved' | 'dismissed';

export type AISuggestionWorkflowKey =
  | 'resume'
  | 'career_path'
  | 'learning'
  | 'jobs'
  | 'profile'
  | 'candidates'
  | 'assistant';

export interface AISuggestionReviewMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  sourceLabel?: string;
  sourceDetail?: string;
  provenanceMode?: AIProvenanceMode;
  controlNote?: string;
  reviewStatus?: AISuggestionReviewStatus;
  reviewedAt?: string;
}

export interface AISuggestionWorkflowHandoff {
  key: AISuggestionWorkflowKey;
  label: string;
  path: string;
  actionLabel: string;
  reason: string;
}

export interface AISuggestionReviewQueueItem extends AISuggestionWorkflowHandoff {
  id: string;
  content: string;
  createdAt?: string;
  sourceLabel: string;
  sourceDetail: string;
  controlNote: string;
  reviewStatus: AISuggestionReviewStatus;
  reviewedAt?: string;
}

export interface AISuggestionReviewQueue {
  items: AISuggestionReviewQueueItem[];
  draftItems: AISuggestionReviewQueueItem[];
  totalCount: number;
  draftCount: number;
  savedCount: number;
  dismissedCount: number;
  summary: string;
}

const compact = (value?: string | null) => (value || '').trim();

const includesAny = (value: string, terms: string[]) => (
  terms.some(term => value.includes(term))
);

const statusRank: Record<AISuggestionReviewStatus, number> = {
  draft: 0,
  saved: 1,
  dismissed: 2,
};

const getReviewStatus = (status?: AISuggestionReviewStatus): AISuggestionReviewStatus => (
  status === 'saved' || status === 'dismissed' ? status : 'draft'
);

const getTimeValue = (value?: string) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

export const classifyAISuggestionWorkflow = (content: string): AISuggestionWorkflowHandoff => {
  const normalized = compact(content).toLowerCase();

  if (includesAny(normalized, ['candidate', 'applicant', 'recruiter', 'hiring', 'scorecard'])) {
    return {
      key: 'candidates',
      label: 'Candidates',
      path: '/candidates',
      actionLabel: 'Open candidates',
      reason: 'This recommendation appears to support recruiter candidate review.',
    };
  }

  if (includesAny(normalized, ['resume', 'cv'])) {
    return {
      key: 'resume',
      label: 'Resume Builder',
      path: '/resume',
      actionLabel: 'Review resume draft',
      reason: 'This recommendation appears to support resume editing.',
    };
  }

  if (includesAny(normalized, ['career path', 'career paths', 'career trajectory', 'career trajectories'])) {
    return {
      key: 'career_path',
      label: 'Career Path',
      path: '/career-path',
      actionLabel: 'Open career path',
      reason: 'This recommendation appears to support career-path planning.',
    };
  }

  if (
    includesAny(normalized, ['course', 'lesson', 'learn', 'learning', 'academy', 'certification']) ||
    (normalized.includes('skill') && normalized.includes('learn'))
  ) {
    return {
      key: 'learning',
      label: 'Learning',
      path: '/lms',
      actionLabel: 'Review learning plan',
      reason: 'This recommendation appears to support course or skill planning.',
    };
  }

  if (includesAny(normalized, ['job', 'application', 'apply', 'cover letter', 'interview', 'role search'])) {
    return {
      key: 'jobs',
      label: 'Jobs & Applications',
      path: '/jobs',
      actionLabel: 'Open jobs',
      reason: 'This recommendation appears to support job search, applications, or interviews.',
    };
  }

  if (includesAny(normalized, ['profile', 'portfolio', 'experience', 'headline'])) {
    return {
      key: 'profile',
      label: 'Profile',
      path: '/profile',
      actionLabel: 'Review profile draft',
      reason: 'This recommendation appears to support profile updates.',
    };
  }

  return {
    key: 'assistant',
    label: 'AI Assistant',
    path: '/ai',
    actionLabel: 'Keep in assistant',
    reason: 'This recommendation is general guidance that should be reviewed in chat.',
  };
};

export const buildAISuggestionReviewQueue = (
  messages: AISuggestionReviewMessage[]
): AISuggestionReviewQueue => {
  const seen = new Set<string>();
  const items = messages
    .filter(message => message.role === 'assistant' && message.id !== 'welcome' && compact(message.content))
    .filter(message => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      return true;
    })
    .map<AISuggestionReviewQueueItem>(message => {
      const handoff = classifyAISuggestionWorkflow(message.content);
      const provenance = normalizeAIProvenance(message);
      return {
        ...handoff,
        id: message.id,
        content: compact(message.content),
        createdAt: message.createdAt,
        sourceLabel: provenance.sourceLabel,
        sourceDetail: provenance.sourceDetail,
        controlNote: compact(message.controlNote) || provenance.controlNote,
        reviewStatus: getReviewStatus(message.reviewStatus),
        reviewedAt: message.reviewedAt,
      };
    })
    .sort((left, right) => {
      const statusDelta = statusRank[left.reviewStatus] - statusRank[right.reviewStatus];
      if (statusDelta !== 0) return statusDelta;
      return getTimeValue(right.createdAt) - getTimeValue(left.createdAt);
    });

  const draftItems = items.filter(item => item.reviewStatus === 'draft');
  const savedCount = items.filter(item => item.reviewStatus === 'saved').length;
  const dismissedCount = items.filter(item => item.reviewStatus === 'dismissed').length;
  const draftCount = draftItems.length;

  return {
    items,
    draftItems,
    totalCount: items.length,
    draftCount,
    savedCount,
    dismissedCount,
    summary: draftCount === 0
      ? 'All AI recommendations reviewed'
      : `${draftCount} AI recommendation${draftCount === 1 ? '' : 's'} waiting for review`,
  };
};
