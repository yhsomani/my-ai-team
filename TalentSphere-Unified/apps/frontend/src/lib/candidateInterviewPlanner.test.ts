import { describe, expect, it } from 'vitest';
import {
  buildCandidateBulkInterviewSummary,
  buildCandidateBulkStatusSummary,
  buildCandidateAdvisorySignal,
  buildCandidateInterviewPlan,
  buildCandidateReviewFocusActions,
  buildCandidateReviewQueueAction,
  buildCandidateReviewQueueNavigation,
  buildCandidateReviewDraftState,
  buildCandidateScorecardAnalytics,
  buildCandidateScorecardSummary,
  candidateScorecardDimensions,
  canDraftCandidateInterviewPlan,
  canMoveCandidateToBulkStatus,
  canMoveCandidateToInterview,
  canMoveCandidateToOffer,
  canMoveCandidateToRejected,
  createDefaultCandidateScorecardRatings,
  filterCandidatesByReviewFocus,
  normalizeCandidateScorecardRating,
} from './candidateInterviewPlanner';

describe('candidateInterviewPlanner', () => {
  it('builds a reviewed interview note draft with two business-day slots', () => {
    const plan = buildCandidateInterviewPlan({
      candidateName: 'Ava Chen',
      candidateEmail: 'ava@example.test',
      roleTitle: 'Frontend Engineer',
      now: new Date('2026-06-04T09:00:00.000Z'),
    });

    expect(plan.candidateName).toBe('Ava Chen');
    expect(plan.roleTitle).toBe('Frontend Engineer');
    expect(plan.suggestedSlots).toHaveLength(2);
    expect(plan.noteDraft).toContain('Interview plan for Ava Chen');
    expect(plan.noteDraft).toContain('Candidate contact: ava@example.test');
    expect(plan.noteDraft).toContain('Confirm availability and interview format');
  });

  it('skips weekend days when suggesting interview slots', () => {
    const plan = buildCandidateInterviewPlan({
      now: new Date('2026-06-05T09:00:00.000Z'),
    });

    expect(plan.suggestedSlots[0].label).toContain('Mon');
    expect(plan.suggestedSlots[1].label).toContain('Tue');
  });

  it('separates draft planning from the explicit move-to-interview action', () => {
    expect(canDraftCandidateInterviewPlan('PENDING')).toBe(true);
    expect(canDraftCandidateInterviewPlan('INTERVIEW')).toBe(true);
    expect(canDraftCandidateInterviewPlan('OFFER')).toBe(false);
    expect(canMoveCandidateToInterview('REVIEWED')).toBe(true);
    expect(canMoveCandidateToInterview('INTERVIEW')).toBe(false);
    expect(canMoveCandidateToInterview('REJECTED')).toBe(false);
  });

  it('summarizes eligible and skipped candidates for bulk interview review', () => {
    const summary = buildCandidateBulkInterviewSummary([
      { id: 'app-1', status: 'PENDING', candidateName: 'Ava Chen', roleTitle: 'Designer' },
      { id: 'app-1', status: 'PENDING', candidateName: 'Duplicate Ava', roleTitle: 'Designer' },
      { id: 'app-2', status: 'INTERVIEW', candidateName: 'Ben Lee', roleTitle: 'Engineer' },
      { id: 'app-3', status: 'OFFER', candidateName: '', roleTitle: '' },
    ]);

    expect(summary.selectedCount).toBe(3);
    expect(summary.eligible.map(candidate => candidate.id)).toEqual(['app-1']);
    expect(summary.skipped.map(candidate => candidate.id)).toEqual(['app-2', 'app-3']);
    expect(summary.skipped[1].candidateName).toBe('Anonymous Candidate');
    expect(summary.skipped[1].roleTitle).toBe('Unknown role');
  });

  it('limits bulk offer decisions to candidates already in interview', () => {
    expect(canMoveCandidateToOffer('INTERVIEW')).toBe(true);
    expect(canMoveCandidateToOffer('REVIEWED')).toBe(false);
    expect(canMoveCandidateToBulkStatus('PENDING', 'OFFER')).toBe(false);

    const summary = buildCandidateBulkStatusSummary([
      { id: 'app-1', status: 'INTERVIEW', candidateName: 'Ava Chen', roleTitle: 'Designer' },
      { id: 'app-2', status: 'REVIEWED', candidateName: 'Ben Lee', roleTitle: 'Engineer' },
      { id: 'app-3', status: 'REJECTED', candidateName: 'Cara Fox', roleTitle: 'Analyst' },
    ], 'OFFER');

    expect(summary.selectedCount).toBe(3);
    expect(summary.eligible.map(candidate => candidate.id)).toEqual(['app-1']);
    expect(summary.skipped.map(candidate => candidate.id)).toEqual(['app-2', 'app-3']);
    expect(summary.skipped[0].skipReason).toContain('Only Interview candidates');
  });

  it('skips final states for bulk rejection decisions', () => {
    expect(canMoveCandidateToRejected('PENDING')).toBe(true);
    expect(canMoveCandidateToRejected('INTERVIEW')).toBe(true);
    expect(canMoveCandidateToRejected('OFFER')).toBe(false);
    expect(canMoveCandidateToBulkStatus('REJECTED', 'REJECTED')).toBe(false);

    const summary = buildCandidateBulkStatusSummary([
      { id: 'app-1', status: 'PENDING', candidateName: 'Ava Chen', roleTitle: 'Designer' },
      { id: 'app-2', status: 'OFFER', candidateName: 'Ben Lee', roleTitle: 'Engineer' },
      { id: 'app-3', status: 'REJECTED', candidateName: '', roleTitle: '' },
    ], 'REJECTED');

    expect(summary.targetStatus).toBe('REJECTED');
    expect(summary.eligible.map(candidate => candidate.id)).toEqual(['app-1']);
    expect(summary.skipped.map(candidate => candidate.id)).toEqual(['app-2', 'app-3']);
    expect(summary.skipped[0].skipReason).toContain('offer rescinds');
    expect(summary.skipped[1].candidateName).toBe('Anonymous Candidate');
  });

  it('normalizes scorecard ratings to a 1-5 scale', () => {
    expect(normalizeCandidateScorecardRating(0)).toBe(1);
    expect(normalizeCandidateScorecardRating(4.6)).toBe(5);
    expect(normalizeCandidateScorecardRating('bad')).toBe(3);
    expect(createDefaultCandidateScorecardRatings()).toEqual({
      role_fit: 3,
      technical_depth: 3,
      communication: 3,
      execution: 3,
    });
  });

  it('builds an advisory scorecard note draft without mutating status', () => {
    const summary = buildCandidateScorecardSummary({
      candidateName: 'Ava Chen',
      roleTitle: 'Frontend Engineer',
      ratings: {
        role_fit: 5,
        technical_depth: 4,
        communication: 4,
        execution: 5,
      },
      evidence: 'Strong portfolio and clear project ownership.',
    });

    expect(candidateScorecardDimensions).toHaveLength(4);
    expect(summary.averageScore).toBe(4.5);
    expect(summary.recommendationLabel).toBe('Strong positive signal');
    expect(summary.noteDraft).toContain('Candidate scorecard for Ava Chen');
    expect(summary.noteDraft).toContain('Overall signal: Strong positive signal (4.5/5)');
    expect(summary.noteDraft).toContain('Control note: This scorecard is advisory');
  });

  it('detects unsaved candidate review note and scorecard drafts', () => {
    expect(buildCandidateReviewDraftState({
      savedNote: 'Promising candidate',
      draftNote: ' Promising candidate ',
      savedRatings: { role_fit: 4, technical_depth: 3, communication: 3, execution: 4 },
      draftRatings: { role_fit: 4, technical_depth: 3, communication: 3, execution: 4 },
      savedEvidence: 'Portfolio review',
      draftEvidence: ' Portfolio review ',
    })).toEqual({
      hasUnsavedNote: false,
      hasUnsavedScorecard: false,
      hasUnsavedChanges: false,
      summary: 'All review changes saved',
    });

    expect(buildCandidateReviewDraftState({
      savedNote: 'Promising candidate',
      draftNote: 'Needs follow-up',
      savedRatings: createDefaultCandidateScorecardRatings(),
      draftRatings: createDefaultCandidateScorecardRatings(),
      savedEvidence: '',
      draftEvidence: '',
    }).summary).toBe('Unsaved note changes');

    expect(buildCandidateReviewDraftState({
      savedNote: '',
      draftNote: 'Note draft',
      savedRatings: createDefaultCandidateScorecardRatings(),
      draftRatings: { ...createDefaultCandidateScorecardRatings(), role_fit: 5 },
      savedEvidence: '',
      draftEvidence: 'Strong portfolio',
    })).toMatchObject({
      hasUnsavedNote: true,
      hasUnsavedScorecard: true,
      hasUnsavedChanges: true,
      summary: 'Unsaved note and scorecard changes',
    });
  });

  it('builds explainable advisory candidate signals without mutating status', () => {
    const signal = buildCandidateAdvisorySignal({
      status: 'INTERVIEW',
      hasResume: true,
      hasCoverLetter: true,
      hasRecruiterNote: true,
      scorecardAverage: 4.6,
      scorecardSource: 'server',
    });

    expect(signal.score).toBeGreaterThanOrEqual(90);
    expect(signal.label).toBe('High signal');
    expect(signal.action).toBe('Review for Offer');
    expect(signal.factors).toContain('Scorecard 4.6/5 (server)');
    expect(signal.factors).toContain('Already in Interview');
    expect(signal.safeguards).toContain('Status changes still require confirmation');
  });

  it('keeps final-state advisory signals conservative', () => {
    const rejected = buildCandidateAdvisorySignal({
      status: 'REJECTED',
      hasResume: true,
      scorecardAverage: 5,
    });
    const missingEvidence = buildCandidateAdvisorySignal({
      status: 'PENDING',
      hasResume: false,
    });

    expect(rejected.score).toBeLessThanOrEqual(25);
    expect(rejected.action).toBe('Rejected; no action suggested');
    expect(rejected.safeguards.join(' ')).toContain('Final-state candidates');
    expect(missingEvidence.label).toBe('Low signal');
    expect(missingEvidence.action).toBe('Complete scorecard before final decision');
    expect(missingEvidence.factors).toContain('No saved scorecard yet');
  });

  it('summarizes current-page scorecard coverage and signal quality', () => {
    const analytics = buildCandidateScorecardAnalytics([
      { id: 'app-1', scorecardAverage: 4.6, source: 'server' },
      { id: 'app-2', scorecardAverage: 2.2, source: 'local' },
      { id: 'app-3', scorecardAverage: null },
      { id: 'app-1', scorecardAverage: 5, source: 'local' },
    ]);

    expect(analytics.totalCount).toBe(3);
    expect(analytics.scoredCount).toBe(2);
    expect(analytics.unscoredCount).toBe(1);
    expect(analytics.coveragePercent).toBe(67);
    expect(analytics.averageScore).toBe(3.4);
    expect(analytics.strongSignalCount).toBe(1);
    expect(analytics.needsEvidenceCount).toBe(2);
    expect(analytics.syncedCount).toBe(1);
    expect(analytics.localCount).toBe(1);
  });

  it('returns empty scorecard analytics for an empty candidate page', () => {
    expect(buildCandidateScorecardAnalytics([])).toEqual({
      totalCount: 0,
      scoredCount: 0,
      unscoredCount: 0,
      coveragePercent: 0,
      averageScore: null,
      strongSignalCount: 0,
      needsEvidenceCount: 0,
      syncedCount: 0,
      localCount: 0,
    });
  });

  it('filters current-page candidates by review focus without mutating records', () => {
    const candidates = [
      { id: 'app-1', hasScorecard: true, advisoryScore: 92, label: 'Ava' },
      { id: 'app-2', hasScorecard: false, advisoryScore: 72, label: 'Ben' },
      { id: 'app-3', hasScorecard: true, advisoryScore: 45, label: 'Cara' },
      { id: 'app-1', hasScorecard: false, advisoryScore: 20, label: 'Duplicate Ava' },
    ];

    expect(filterCandidatesByReviewFocus(candidates, 'all').map(candidate => candidate.id)).toEqual(['app-1', 'app-2', 'app-3']);
    expect(filterCandidatesByReviewFocus(candidates, 'needs_scorecard').map(candidate => candidate.id)).toEqual(['app-2']);
    expect(filterCandidatesByReviewFocus(candidates, 'high_signal').map(candidate => candidate.id)).toEqual(['app-1']);
    expect(candidates).toHaveLength(4);
  });

  it('builds explicit current-page focus actions from review analytics', () => {
    const actions = buildCandidateReviewFocusActions({
      currentFocus: 'all',
      totalCount: 8,
      unscoredCount: 3,
      highSignalCount: 2,
    });

    expect(actions).toEqual([
      { focus: 'needs_scorecard', label: 'Review gaps', count: 3, disabled: false },
      { focus: 'high_signal', label: 'Review high signal', count: 2, disabled: false },
      { focus: 'all', label: 'Show all', count: 8, disabled: true },
    ]);

    const scopedActions = buildCandidateReviewFocusActions({
      currentFocus: 'high_signal',
      totalCount: 2,
      unscoredCount: 1,
      highSignalCount: 2,
    });

    expect(scopedActions.find(action => action.focus === 'needs_scorecard')?.disabled).toBe(true);
    expect(scopedActions.find(action => action.focus === 'high_signal')?.disabled).toBe(true);
    expect(scopedActions.find(action => action.focus === 'all')?.disabled).toBe(false);
  });

  it('builds an explicit first-candidate review queue action', () => {
    const action = buildCandidateReviewQueueAction({
      focus: 'needs_scorecard',
      candidates: [
        { id: 'app-2', candidateName: 'Ben Lee', roleTitle: 'Designer' },
        { id: 'app-2', candidateName: 'Duplicate Ben', roleTitle: 'Designer' },
        { id: 'app-3', candidateName: 'Cara Fox', roleTitle: 'Engineer' },
      ],
    });

    expect(action).toEqual({
      candidateId: 'app-2',
      label: 'Review first in focus',
      description: 'Open Ben Lee for Designer. 2 candidates in current focus available.',
      count: 2,
      disabled: false,
    });

    expect(buildCandidateReviewQueueAction({
      focus: 'all',
      candidates: [],
    })).toEqual({
      candidateId: null,
      label: 'Review first visible',
      description: 'No visible candidates to review.',
      count: 0,
      disabled: true,
    });
  });

  it('builds current-queue previous and next candidate navigation', () => {
    const candidates = [
      { id: 'app-1', candidateName: 'Ava Chen' },
      { id: 'app-2', candidateName: 'Ben Lee' },
      { id: 'app-2', candidateName: 'Duplicate Ben' },
      { id: 'app-3', candidateName: 'Cara Fox' },
    ];

    expect(buildCandidateReviewQueueNavigation({
      currentCandidateId: 'app-2',
      candidates,
    })).toEqual({
      previousCandidateId: 'app-1',
      nextCandidateId: 'app-3',
      position: 2,
      totalCount: 3,
      label: 'Candidate 2 of 3 in current queue',
    });

    expect(buildCandidateReviewQueueNavigation({
      currentCandidateId: 'app-1',
      candidates,
    }).previousCandidateId).toBeNull();

    expect(buildCandidateReviewQueueNavigation({
      currentCandidateId: 'missing',
      candidates,
    })).toEqual({
      previousCandidateId: null,
      nextCandidateId: null,
      position: 0,
      totalCount: 3,
      label: 'Candidate not in current queue',
    });
  });
});
