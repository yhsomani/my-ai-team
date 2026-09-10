import { describe, expect, it } from 'vitest';
import {
  calculateLevel,
  calculateLevelProgress,
  DAILY_XP_MAX_CAP,
  evaluateXpAwardEligibility,
  getChallengeXpReward,
  getCourseCompletionXpReward,
  getLessonXpReward,
  type ExistingXpTransaction,
} from './xpLedger';

describe('xpLedger (R-06 / QC-8 / RU-10)', () => {
  const baseDate = new Date('2026-08-30T12:00:00.000Z');

  describe('calculateLevel', () => {
    it('calculates 100 XP per level starting at Level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(50)).toBe(1);
      expect(calculateLevel(99)).toBe(1);
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(250)).toBe(3);
      expect(calculateLevel(1000)).toBe(11);
    });

    it('handles negative, NaN, and undefined inputs safely', () => {
      expect(calculateLevel(-50)).toBe(1);
      expect(calculateLevel(Number.NaN)).toBe(1);
      expect(calculateLevel(undefined as any)).toBe(1);
    });
  });

  describe('calculateLevelProgress', () => {
    it('calculates exact thresholds, remaining XP, and percentage', () => {
      const progress = calculateLevelProgress(240);

      expect(progress.level).toBe(3);
      expect(progress.totalXp).toBe(240);
      expect(progress.currentLevelBaseXp).toBe(200);
      expect(progress.nextLevelBaseXp).toBe(300);
      expect(progress.xpInCurrentLevel).toBe(40);
      expect(progress.xpToNextLevel).toBe(60);
      expect(progress.progressPercentage).toBe(40);
    });

    it('handles 0 XP and exact level boundaries', () => {
      const zeroProgress = calculateLevelProgress(0);
      expect(zeroProgress.level).toBe(1);
      expect(zeroProgress.progressPercentage).toBe(0);
      expect(zeroProgress.xpToNextLevel).toBe(100);

      const boundaryProgress = calculateLevelProgress(300);
      expect(boundaryProgress.level).toBe(4);
      expect(boundaryProgress.currentLevelBaseXp).toBe(300);
      expect(boundaryProgress.nextLevelBaseXp).toBe(400);
      expect(boundaryProgress.progressPercentage).toBe(0);
      expect(boundaryProgress.xpToNextLevel).toBe(100);
    });
  });

  describe('reward helpers', () => {
    it('resolves challenge XP based on difficulty', () => {
      expect(getChallengeXpReward('EASY')).toBe(25);
      expect(getChallengeXpReward('MEDIUM')).toBe(50);
      expect(getChallengeXpReward('HARD')).toBe(100);
      expect(getChallengeXpReward('EXTREME')).toBe(100);
      expect(getChallengeXpReward(undefined, 80)).toBe(80);
    });

    it('resolves lesson and course milestone XP rewards', () => {
      expect(getLessonXpReward()).toBe(10);
      expect(getLessonXpReward(20)).toBe(20);
      expect(getCourseCompletionXpReward()).toBe(100);
      expect(getCourseCompletionXpReward(250)).toBe(250);
    });
  });

  describe('evaluateXpAwardEligibility', () => {
    it('rejects invalid or non-positive amounts', () => {
      const result = evaluateXpAwardEligibility({
        existingTransactions: [],
        amount: 0,
      });

      expect(result.eligible).toBe(false);
      expect(result.skipReason).toBe('invalid_amount');
    });

    it('enforces anti-farm deduplication (XP-once rule) for identical reference', () => {
      const existing: ExistingXpTransaction[] = [
        {
          id: 'tx-1',
          user_id: 'u-1',
          amount: 50,
          reason: 'Completed challenge: String Normalizer',
          reference_type: 'challenge',
          reference_id: 'challenge-1',
          created_at: '2026-08-25T10:00:00.000Z',
        },
      ];

      const duplicateAttempt = evaluateXpAwardEligibility({
        existingTransactions: existing,
        amount: 50,
        referenceType: 'challenge',
        referenceId: 'challenge-1',
        now: baseDate,
      });

      expect(duplicateAttempt.eligible).toBe(false);
      expect(duplicateAttempt.skipReason).toBe('already_awarded');
      expect(duplicateAttempt.message).toContain('already been awarded');
    });

    it('allows XP award for distinct reference ID or distinct reference type', () => {
      const existing: ExistingXpTransaction[] = [
        {
          id: 'tx-1',
          user_id: 'u-1',
          amount: 50,
          reference_type: 'challenge',
          reference_id: 'challenge-1',
          created_at: '2026-08-25T10:00:00.000Z',
        },
      ];

      const newChallenge = evaluateXpAwardEligibility({
        existingTransactions: existing,
        amount: 100,
        referenceType: 'challenge',
        referenceId: 'challenge-2',
        now: baseDate,
      });

      expect(newChallenge.eligible).toBe(true);
      expect(newChallenge.grantedAmount).toBe(100);
      expect(newChallenge.skipReason).toBeNull();
    });

    it('enforces daily XP cap when cap is reached today', () => {
      const existing: ExistingXpTransaction[] = [
        {
          id: 'tx-1',
          amount: 600,
          created_at: '2026-08-30T02:00:00.000Z', // today
        },
        {
          id: 'tx-2',
          amount: 400,
          created_at: '2026-08-30T04:00:00.000Z', // today: total 1000
        },
        {
          id: 'tx-old',
          amount: 500,
          created_at: '2026-08-29T10:00:00.000Z', // yesterday
        },
      ];

      const result = evaluateXpAwardEligibility({
        existingTransactions: existing,
        amount: 50,
        referenceType: 'challenge',
        referenceId: 'challenge-3',
        now: baseDate,
        dailyCap: DAILY_XP_MAX_CAP,
      });

      expect(result.eligible).toBe(false);
      expect(result.skipReason).toBe('daily_cap_reached');
      expect(result.todayEarnedXp).toBe(1000);
      expect(result.remainingDailyCap).toBe(0);
    });

    it('adjusts partial XP grant when approaching daily limit', () => {
      const existing: ExistingXpTransaction[] = [
        {
          id: 'tx-1',
          amount: 950,
          created_at: '2026-08-30T05:00:00.000Z', // today
        },
      ];

      const result = evaluateXpAwardEligibility({
        existingTransactions: existing,
        amount: 100,
        referenceType: 'challenge',
        referenceId: 'challenge-4',
        now: baseDate,
        dailyCap: DAILY_XP_MAX_CAP,
      });

      expect(result.eligible).toBe(true);
      expect(result.grantedAmount).toBe(50); // capped to remaining 50
      expect(result.skipReason).toBe('daily_cap_adjusted');
      expect(result.message).toContain('adjusted');
    });
  });
});
