import { describe, expect, it } from 'vitest';
import {
  calculateRecruiterFunnelSummary,
  evaluateCandidateSla,
  normalizeFunnelStatus,
  SLA_IDLE_DAYS_THRESHOLD,
  SLA_WARNING_DAYS_THRESHOLD,
} from './recruiterFunnelAnalytics';
import type { Application, CandidateNote, CandidateScorecard } from '../services/recruiterService';

describe('recruiterFunnelAnalytics (R-05)', () => {
  const baseDate = new Date('2026-08-30T12:00:00Z');

  describe('normalizeFunnelStatus', () => {
    it('normalizes empty, undefined, PENDING and NEW to APPLIED', () => {
      expect(normalizeFunnelStatus('')).toBe('APPLIED');
      expect(normalizeFunnelStatus(undefined)).toBe('APPLIED');
      expect(normalizeFunnelStatus('PENDING')).toBe('APPLIED');
      expect(normalizeFunnelStatus('new')).toBe('APPLIED');
      expect(normalizeFunnelStatus('  pending  ')).toBe('APPLIED');
    });

    it('preserves and trims valid uppercase funnel states', () => {
      expect(normalizeFunnelStatus('reviewed')).toBe('REVIEWED');
      expect(normalizeFunnelStatus('  interview ')).toBe('INTERVIEW');
      expect(normalizeFunnelStatus('offer')).toBe('OFFER');
      expect(normalizeFunnelStatus('rejected')).toBe('REJECTED');
    });
  });

  describe('evaluateCandidateSla', () => {
    const mockApp = (status: string, appliedDaysAgo: number, updatedDaysAgo?: number): Application => {
      const appliedAt = new Date(baseDate.getTime() - appliedDaysAgo * 24 * 60 * 60 * 1000).toISOString();
      const updatedAt = updatedDaysAgo !== undefined
        ? new Date(baseDate.getTime() - updatedDaysAgo * 24 * 60 * 60 * 1000).toISOString()
        : appliedAt;

      return {
        id: 'app-1',
        jobId: 'job-1',
        userId: 'user-1',
        candidateId: 'user-1',
        status,
        appliedAt,
        updatedAt,
      };
    };

    it('flags healthy SLA when candidate was updated recently (<4 days)', () => {
      const candidate = mockApp('APPLIED', 2);
      const sla = evaluateCandidateSla({ candidate, now: baseDate });

      expect(sla.daysIdle).toBe(2);
      expect(sla.isSlaBreached).toBe(false);
      expect(sla.isSlaWarning).toBe(false);
      expect(sla.slaStatus).toBe('healthy');
      expect(sla.slaBadgeLabel).toContain('2d in stage');
    });

    it('flags SLA warning when candidate has been idle for 4-6 days', () => {
      const candidate = mockApp('REVIEWED', 5);
      const sla = evaluateCandidateSla({ candidate, now: baseDate });

      expect(sla.daysIdle).toBe(5);
      expect(sla.isSlaBreached).toBe(false);
      expect(sla.isSlaWarning).toBe(true);
      expect(sla.slaStatus).toBe('warning');
      expect(sla.slaBadgeLabel).toContain('SLA Warning');
      expect(sla.recommendedAction).toContain('Approaching 7-day review SLA');
    });

    it('flags SLA breach when candidate has been idle for 7+ days', () => {
      const candidate = mockApp('APPLIED', 8);
      const sla = evaluateCandidateSla({ candidate, now: baseDate });

      expect(sla.daysIdle).toBe(8);
      expect(sla.isSlaBreached).toBe(true);
      expect(sla.isSlaWarning).toBe(false);
      expect(sla.slaStatus).toBe('breached');
      expect(sla.slaBadgeLabel).toContain('SLA Breach');
      expect(sla.recommendedAction).toContain('Initial review overdue');
    });

    it('gives interview-specific guidance for breached interview candidate', () => {
      const candidate = mockApp('INTERVIEW', 10);
      const sla = evaluateCandidateSla({ candidate, now: baseDate });

      expect(sla.isSlaBreached).toBe(true);
      expect(sla.recommendedAction).toContain('Post-interview decision overdue');
    });

    it('considers latest activity across candidate, note, and scorecard', () => {
      const candidate = mockApp('APPLIED', 12, 12); // candidate itself is 12 days old
      const note: CandidateNote = {
        id: 'n-1',
        applicationId: 'app-1',
        recruiterId: 'rec-1',
        content: 'Followed up with candidate',
        createdAt: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      };

      const sla = evaluateCandidateSla({ candidate, note, now: baseDate });
      expect(sla.daysIdle).toBe(2);
      expect(sla.isSlaBreached).toBe(false);
      expect(sla.slaStatus).toBe('healthy');
    });

    it('marks final states (OFFER / REJECTED) as resolved regardless of idle days', () => {
      const offerCandidate = mockApp('OFFER', 20);
      const offerSla = evaluateCandidateSla({ candidate: offerCandidate, now: baseDate });
      expect(offerSla.isSlaBreached).toBe(false);
      expect(offerSla.slaStatus).toBe('resolved');
      expect(offerSla.slaBadgeLabel).toBe('Offered');

      const rejectedCandidate = mockApp('REJECTED', 30);
      const rejectedSla = evaluateCandidateSla({ candidate: rejectedCandidate, now: baseDate });
      expect(rejectedSla.isSlaBreached).toBe(false);
      expect(rejectedSla.slaStatus).toBe('resolved');
      expect(rejectedSla.slaBadgeLabel).toBe('Closed');
    });
  });

  describe('calculateRecruiterFunnelSummary', () => {
    it('returns empty summary structure when candidate list is empty', () => {
      const summary = calculateRecruiterFunnelSummary([], {}, {}, baseDate);
      expect(summary.totalApplicants).toBe(0);
      expect(summary.activeJobsCount).toBe(0);
      expect(summary.postingFunnels).toHaveLength(0);
      expect(summary.totalSlaBreaches).toBe(0);
      expect(summary.overallStages).toHaveLength(4);
      expect(summary.overallStages[0].count).toBe(0);
    });

    it('calculates job-level and aggregate conversion funnels accurately', () => {
      const candidates: Application[] = [
        // Job 1 (Frontend): 4 applicants (1 offer, 1 interview, 1 reviewed, 1 applied)
        {
          id: 'app-1',
          jobId: 'job-fe',
          job: { title: 'Senior Frontend Engineer' },
          userId: 'u1',
          candidateId: 'u1',
          status: 'OFFER',
          appliedAt: new Date(baseDate.getTime() - 10 * 86400000).toISOString(),
        },
        {
          id: 'app-2',
          jobId: 'job-fe',
          job: { title: 'Senior Frontend Engineer' },
          userId: 'u2',
          candidateId: 'u2',
          status: 'INTERVIEW',
          appliedAt: new Date(baseDate.getTime() - 8 * 86400000).toISOString(), // breached (8d)
        },
        {
          id: 'app-3',
          jobId: 'job-fe',
          job: { title: 'Senior Frontend Engineer' },
          userId: 'u3',
          candidateId: 'u3',
          status: 'REVIEWED',
          appliedAt: new Date(baseDate.getTime() - 5 * 86400000).toISOString(), // warning (5d)
        },
        {
          id: 'app-4',
          jobId: 'job-fe',
          job: { title: 'Senior Frontend Engineer' },
          userId: 'u4',
          candidateId: 'u4',
          status: 'APPLIED',
          appliedAt: new Date(baseDate.getTime() - 1 * 86400000).toISOString(), // healthy (1d)
        },

        // Job 2 (Backend): 2 applicants (1 interview, 1 applied)
        {
          id: 'app-5',
          jobId: 'job-be',
          job: { title: 'Backend Architect' },
          userId: 'u5',
          candidateId: 'u5',
          status: 'INTERVIEW',
          appliedAt: new Date(baseDate.getTime() - 9 * 86400000).toISOString(), // breached (9d)
        },
        {
          id: 'app-6',
          jobId: 'job-be',
          job: { title: 'Backend Architect' },
          userId: 'u6',
          candidateId: 'u6',
          status: 'APPLIED',
          appliedAt: new Date(baseDate.getTime() - 2 * 86400000).toISOString(), // healthy (2d)
        },
      ];

      const summary = calculateRecruiterFunnelSummary(candidates, {}, {}, baseDate);

      expect(summary.totalApplicants).toBe(6);
      expect(summary.activeJobsCount).toBe(2);
      expect(summary.totalSlaBreaches).toBe(2); // app-2 and app-5
      expect(summary.totalSlaWarnings).toBe(1); // app-3

      // Check Job 1 metrics
      const feJob = summary.postingFunnels.find((p) => p.jobId === 'job-fe');
      expect(feJob).toBeDefined();
      expect(feJob!.totalApplicants).toBe(4);
      expect(feJob!.slaBreachCount).toBe(1);
      expect(feJob!.slaWarningCount).toBe(1);

      // Reached applied: 4, reviewed: 3 (1 offer + 1 interview + 1 reviewed), interview: 2 (1 offer + 1 interview), offer: 1
      expect(feJob!.stages[0].count).toBe(4); // Applied
      expect(feJob!.stages[1].count).toBe(3); // Reviewed
      expect(feJob!.stages[2].count).toBe(2); // Interview
      expect(feJob!.stages[3].count).toBe(1); // Offer

      // Conversions:
      // Applied -> Reviewed: 3/4 = 75%
      // Reviewed -> Interview: 2/3 = 67%
      // Interview -> Offer: 1/2 = 50%
      expect(feJob!.stages[1].conversionFromPrevious).toBe(75);
      expect(feJob!.stages[2].conversionFromPrevious).toBe(67);
      expect(feJob!.stages[3].conversionFromPrevious).toBe(50);
    });
  });
});
