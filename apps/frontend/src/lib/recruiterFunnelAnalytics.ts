/**
 * Recruiter Posting-Level Funnel Analytics & 7-Day Idle SLA Nudges (R-05 / PRD / BRD)
 *
 * Provides:
 * 1. Stage conversion funnel calculations (Applied -> Reviewed -> Interview -> Offer)
 * 2. Posting-level conversion analytics and drop-off rates
 * 3. 7-Day Idle SLA detection with warning thresholds and recommended actions
 */

import { parseDateInput } from './dateUtils';
import type { Application, CandidateNote, CandidateScorecard } from '../services/recruiterService';

export const SLA_IDLE_DAYS_THRESHOLD = 7;
export const SLA_WARNING_DAYS_THRESHOLD = 4;

export type FunnelStageId = 'applied' | 'reviewed' | 'interview' | 'offer';

export interface FunnelStageMetric {
  id: FunnelStageId;
  label: string;
  count: number;
  conversionFromPrevious: number; // Percent 0-100
  conversionFromTotal: number; // Percent 0-100
  dropoffRate: number; // Percent 0-100
}

export interface JobPostingFunnel {
  jobId: string;
  jobTitle: string;
  totalApplicants: number;
  stageCounts: {
    applied: number;
    reviewed: number;
    interview: number;
    offer: number;
    rejected: number;
  };
  appliedToInterviewRate: number;
  interviewToOfferRate: number;
  overallOfferRate: number;
  slaBreachCount: number;
  slaWarningCount: number;
  stages: FunnelStageMetric[];
}

export interface RecruiterFunnelSummary {
  totalApplicants: number;
  activeJobsCount: number;
  overallStages: FunnelStageMetric[];
  appliedToInterviewRate: number;
  interviewToOfferRate: number;
  overallOfferRate: number;
  totalSlaBreaches: number;
  totalSlaWarnings: number;
  topDropoffStage: FunnelStageId | null;
  postingFunnels: JobPostingFunnel[];
}

export type SlaStatus = 'healthy' | 'warning' | 'breached' | 'resolved';

export interface CandidateSlaInfo {
  candidateId: string;
  status: string;
  daysIdle: number;
  isSlaBreached: boolean;
  isSlaWarning: boolean;
  slaStatus: SlaStatus;
  slaBadgeLabel: string;
  recommendedAction: string;
  lastActivityDate: Date;
}

export interface CandidateSlaInput {
  candidate: Application;
  note?: CandidateNote | null;
  scorecard?: CandidateScorecard | null;
  now?: Date;
}

/**
 * Normalizes application status into standard funnel buckets.
 */
export function normalizeFunnelStatus(status?: string): string {
  const s = (status || '').trim().toUpperCase();
  if (!s || s === 'PENDING' || s === 'NEW') return 'APPLIED';
  return s;
}

/**
 * Computes the idle days and SLA status for an individual candidate.
 */
export function evaluateCandidateSla({
  candidate,
  note,
  scorecard,
  now = new Date(),
}: CandidateSlaInput): CandidateSlaInfo {
  const status = normalizeFunnelStatus(candidate.status);
  const isFinalState = status === 'OFFER' || status === 'REJECTED';

  // Determine latest activity timestamp (updatedAt, note update, scorecard update, appliedAt)
  const timestamps: number[] = [];

  const appliedDate = parseDateInput(candidate.appliedAt);
  if (appliedDate) timestamps.push(appliedDate.getTime());

  const updatedDate = parseDateInput(candidate.updatedAt);
  if (updatedDate) timestamps.push(updatedDate.getTime());

  if (note?.updatedAt) {
    const noteDate = parseDateInput(note.updatedAt);
    if (noteDate) timestamps.push(noteDate.getTime());
  }

  if (scorecard?.updatedAt) {
    const scorecardDate = parseDateInput(scorecard.updatedAt);
    if (scorecardDate) timestamps.push(scorecardDate.getTime());
  }

  const latestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : now.getTime();
  const lastActivityDate = new Date(latestTimestamp);

  const diffMs = Math.max(0, now.getTime() - latestTimestamp);
  const daysIdle = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (isFinalState) {
    return {
      candidateId: candidate.id,
      status: candidate.status,
      daysIdle,
      isSlaBreached: false,
      isSlaWarning: false,
      slaStatus: 'resolved',
      slaBadgeLabel: status === 'OFFER' ? 'Offered' : 'Closed',
      recommendedAction: status === 'OFFER' ? 'Monitor candidate onboarding' : 'No further action required',
      lastActivityDate,
    };
  }

  const isSlaBreached = daysIdle >= SLA_IDLE_DAYS_THRESHOLD;
  const isSlaWarning = !isSlaBreached && daysIdle >= SLA_WARNING_DAYS_THRESHOLD;

  let slaStatus: SlaStatus = 'healthy';
  let slaBadgeLabel = `${daysIdle}d active`;
  let recommendedAction = 'Continue standard review process';

  if (isSlaBreached) {
    slaStatus = 'breached';
    slaBadgeLabel = `⚠️ SLA Breach: ${daysIdle}d idle`;
    if (status === 'APPLIED') {
      recommendedAction = 'Initial review overdue. Screen resume and move to Reviewed or Reject.';
    } else if (status === 'REVIEWED') {
      recommendedAction = 'Interview decision overdue. Schedule interview or notify candidate.';
    } else if (status === 'INTERVIEW') {
      recommendedAction = 'Post-interview decision overdue. Complete scorecard and extend Offer or Reject.';
    } else {
      recommendedAction = `Application idle for ${daysIdle} days. Update status or add recruiter note.`;
    }
  } else if (isSlaWarning) {
    slaStatus = 'warning';
    slaBadgeLabel = `⏳ SLA Warning: ${daysIdle}d idle`;
    recommendedAction = `Approaching 7-day review SLA (${daysIdle} days elapsed). Take next review step soon.`;
  } else {
    slaBadgeLabel = daysIdle === 0 ? 'Updated today' : `${daysIdle}d in stage`;
  }

  return {
    candidateId: candidate.id,
    status: candidate.status,
    daysIdle,
    isSlaBreached,
    isSlaWarning,
    slaStatus,
    slaBadgeLabel,
    recommendedAction,
    lastActivityDate,
  };
}

/**
 * Builds funnel stage metrics for a given subset of application statuses.
 */
function buildStageMetrics(
  total: number,
  counts: { applied: number; reviewed: number; interview: number; offer: number }
): FunnelStageMetric[] {
  if (total === 0) {
    return [
      { id: 'applied', label: 'Applied', count: 0, conversionFromPrevious: 100, conversionFromTotal: 0, dropoffRate: 0 },
      { id: 'reviewed', label: 'Reviewed', count: 0, conversionFromPrevious: 0, conversionFromTotal: 0, dropoffRate: 0 },
      { id: 'interview', label: 'Interview', count: 0, conversionFromPrevious: 0, conversionFromTotal: 0, dropoffRate: 0 },
      { id: 'offer', label: 'Offer', count: 0, conversionFromPrevious: 0, conversionFromTotal: 0, dropoffRate: 0 },
    ];
  }

  // Funnel logic: candidates at 'offer' have passed through 'interview', 'reviewed', and 'applied'.
  // Candidates at 'interview' have passed through 'reviewed' and 'applied'.
  // Candidates at 'reviewed' have passed through 'applied'.
  const reachedApplied = total;
  const reachedReviewed = counts.reviewed + counts.interview + counts.offer;
  const reachedInterview = counts.interview + counts.offer;
  const reachedOffer = counts.offer;

  const appliedConversion = 100;
  const reviewedConversion = reachedApplied > 0 ? Math.round((reachedReviewed / reachedApplied) * 100) : 0;
  const interviewConversion = reachedReviewed > 0 ? Math.round((reachedInterview / reachedReviewed) * 100) : 0;
  const offerConversion = reachedInterview > 0 ? Math.round((reachedOffer / reachedInterview) * 100) : 0;

  return [
    {
      id: 'applied',
      label: 'Applied',
      count: reachedApplied,
      conversionFromPrevious: appliedConversion,
      conversionFromTotal: 100,
      dropoffRate: Math.max(0, 100 - reviewedConversion),
    },
    {
      id: 'reviewed',
      label: 'Screened / Reviewed',
      count: reachedReviewed,
      conversionFromPrevious: reviewedConversion,
      conversionFromTotal: Math.round((reachedReviewed / total) * 100),
      dropoffRate: Math.max(0, 100 - interviewConversion),
    },
    {
      id: 'interview',
      label: 'Interview',
      count: reachedInterview,
      conversionFromPrevious: interviewConversion,
      conversionFromTotal: Math.round((reachedInterview / total) * 100),
      dropoffRate: Math.max(0, 100 - offerConversion),
    },
    {
      id: 'offer',
      label: 'Offer',
      count: reachedOffer,
      conversionFromPrevious: offerConversion,
      conversionFromTotal: Math.round((reachedOffer / total) * 100),
      dropoffRate: 0,
    },
  ];
}

/**
 * Calculates posting-level and overall recruitment funnel analytics from application records.
 */
export function calculateRecruiterFunnelSummary(
  candidates: Application[],
  notes: Record<string, CandidateNote> = {},
  scorecards: Record<string, CandidateScorecard> = {},
  now: Date = new Date()
): RecruiterFunnelSummary {
  // Group candidates by jobId
  const jobMap = new Map<string, { jobTitle: string; items: Application[] }>();

  for (const candidate of candidates) {
    const jId = candidate.jobId || 'unassigned';
    const jTitle = candidate.job?.title || `Job #${jId}`;
    if (!jobMap.has(jId)) {
      jobMap.set(jId, { jobTitle: jTitle, items: [] });
    }
    jobMap.get(jId)!.items.push(candidate);
  }

  let totalSlaBreaches = 0;
  let totalSlaWarnings = 0;

  const postingFunnels: JobPostingFunnel[] = [];

  for (const [jobId, { jobTitle, items }] of jobMap.entries()) {
    let appliedCount = 0;
    let reviewedCount = 0;
    let interviewCount = 0;
    let offerCount = 0;
    let rejectedCount = 0;
    let jobSlaBreaches = 0;
    let jobSlaWarnings = 0;

    for (const item of items) {
      const status = normalizeFunnelStatus(item.status);
      const sla = evaluateCandidateSla({
        candidate: item,
        note: notes[item.id],
        scorecard: scorecards[item.id],
        now,
      });

      if (sla.isSlaBreached) {
        jobSlaBreaches++;
        totalSlaBreaches++;
      } else if (sla.isSlaWarning) {
        jobSlaWarnings++;
        totalSlaWarnings++;
      }

      if (status === 'OFFER') offerCount++;
      else if (status === 'INTERVIEW') interviewCount++;
      else if (status === 'REVIEWED') reviewedCount++;
      else if (status === 'REJECTED') rejectedCount++;
      else appliedCount++;
    }

    const totalApplicants = items.length;
    const stageCounts = {
      applied: appliedCount,
      reviewed: reviewedCount,
      interview: interviewCount,
      offer: offerCount,
      rejected: rejectedCount,
    };

    const stages = buildStageMetrics(totalApplicants, stageCounts);
    const reachedInterview = interviewCount + offerCount;
    const reachedOffer = offerCount;

    const appliedToInterviewRate = totalApplicants > 0 ? Math.round((reachedInterview / totalApplicants) * 100) : 0;
    const interviewToOfferRate = reachedInterview > 0 ? Math.round((reachedOffer / reachedInterview) * 100) : 0;
    const overallOfferRate = totalApplicants > 0 ? Math.round((reachedOffer / totalApplicants) * 100) : 0;

    postingFunnels.push({
      jobId,
      jobTitle,
      totalApplicants,
      stageCounts,
      appliedToInterviewRate,
      interviewToOfferRate,
      overallOfferRate,
      slaBreachCount: jobSlaBreaches,
      slaWarningCount: jobSlaWarnings,
      stages,
    });
  }

  // Sort posting funnels by total applicants descending
  postingFunnels.sort((a, b) => b.totalApplicants - a.totalApplicants);

  // Overall aggregate metrics
  const totalApplicants = candidates.length;
  let aggApplied = 0;
  let aggReviewed = 0;
  let aggInterview = 0;
  let aggOffer = 0;

  for (const c of candidates) {
    const st = normalizeFunnelStatus(c.status);
    if (st === 'OFFER') aggOffer++;
    else if (st === 'INTERVIEW') aggInterview++;
    else if (st === 'REVIEWED') aggReviewed++;
    else aggApplied++;
  }

  const overallStages = buildStageMetrics(totalApplicants, {
    applied: aggApplied,
    reviewed: aggReviewed,
    interview: aggInterview,
    offer: aggOffer,
  });

  const totalInterviewReached = aggInterview + aggOffer;
  const appliedToInterviewRate = totalApplicants > 0 ? Math.round((totalInterviewReached / totalApplicants) * 100) : 0;
  const interviewToOfferRate = totalInterviewReached > 0 ? Math.round((aggOffer / totalInterviewReached) * 100) : 0;
  const overallOfferRate = totalApplicants > 0 ? Math.round((aggOffer / totalApplicants) * 100) : 0;

  // Identify stage with highest drop-off rate
  let maxDropoff = -1;
  let topDropoffStage: FunnelStageId | null = null;
  for (const stage of overallStages) {
    if (stage.id !== 'offer' && stage.dropoffRate > maxDropoff) {
      maxDropoff = stage.dropoffRate;
      topDropoffStage = stage.id;
    }
  }

  return {
    totalApplicants,
    activeJobsCount: jobMap.size,
    overallStages,
    appliedToInterviewRate,
    interviewToOfferRate,
    overallOfferRate,
    totalSlaBreaches,
    totalSlaWarnings,
    topDropoffStage,
    postingFunnels,
  };
}
