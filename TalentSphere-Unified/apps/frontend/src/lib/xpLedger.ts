/**
 * Unified XP Ledger & Anti-Farm Domain Logic (R-06 / QC-8 / RU-10)
 *
 * Provides:
 * 1. Mathematical Level Calculation (100 XP per level, 1-indexed)
 * 2. Level Progress & Next Milestone Tracking
 * 3. Standard Activity XP Rewards (Challenges, Lessons, Courses)
 * 4. Anti-Farm Eligibility Engine (XP-once deduplication & daily action caps)
 */

import { parseDateInput } from './dateUtils';

export const DAILY_XP_MAX_CAP = 1000;
export const CHALLENGE_DEFAULT_XP = 50;
export const LESSON_DEFAULT_XP = 10;
export const COURSE_COMPLETION_MILESTONE_XP = 100;

export interface LevelProgressInfo {
  level: number;
  totalXp: number;
  currentLevelBaseXp: number;
  nextLevelBaseXp: number;
  xpInCurrentLevel: number;
  xpToNextLevel: number;
  progressPercentage: number;
}

export type XpSkipReason =
  | 'already_awarded'
  | 'daily_cap_reached'
  | 'invalid_amount'
  | 'daily_cap_adjusted'
  | null;

export interface XpEligibilityResult {
  eligible: boolean;
  grantedAmount: number;
  skipReason: XpSkipReason;
  message: string;
  todayEarnedXp: number;
  remainingDailyCap: number;
}

export interface ExistingXpTransaction {
  id?: string;
  user_id?: string;
  amount: number;
  reason?: string;
  reference_type?: string | null;
  reference_id?: string | null;
  created_at?: string | null;
}

export interface EvaluateXpAwardInput {
  existingTransactions: ExistingXpTransaction[];
  amount: number;
  referenceType?: string | null;
  referenceId?: string | null;
  now?: Date;
  dailyCap?: number;
}

/**
 * Calculates user level based on total XP.
 * Rule: Level 1 = 0-99 XP, Level 2 = 100-199 XP, Level N = (N-1)*100 to N*100-1 XP.
 */
export function calculateLevel(totalXp: number): number {
  const safeXp = Math.max(0, Math.floor(Number(totalXp) || 0));
  return Math.floor(safeXp / 100) + 1;
}

/**
 * Computes level progression, base thresholds, and percentage toward the next level.
 */
export function calculateLevelProgress(totalXp: number): LevelProgressInfo {
  const safeXp = Math.max(0, Math.floor(Number(totalXp) || 0));
  const level = calculateLevel(safeXp);
  const currentLevelBaseXp = (level - 1) * 100;
  const nextLevelBaseXp = level * 100;
  const xpInCurrentLevel = safeXp - currentLevelBaseXp;
  const xpToNextLevel = nextLevelBaseXp - safeXp;
  const progressPercentage = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / 100) * 100)));

  return {
    level,
    totalXp: safeXp,
    currentLevelBaseXp,
    nextLevelBaseXp,
    xpInCurrentLevel,
    xpToNextLevel,
    progressPercentage,
  };
}

/**
 * Resolves standard challenge XP reward based on difficulty or explicit configuration.
 */
export function getChallengeXpReward(difficulty?: string, customXpReward?: number): number {
  if (typeof customXpReward === 'number' && customXpReward > 0) {
    return Math.round(customXpReward);
  }

  const diff = (difficulty || '').toLowerCase().trim();
  if (diff.includes('hard') || diff.includes('extreme') || diff === 'high') {
    return 100;
  }
  if (diff.includes('medium') || diff === 'mid') {
    return 50;
  }
  if (diff.includes('easy') || diff.includes('beginner') || diff === 'low') {
    return 25;
  }

  return CHALLENGE_DEFAULT_XP;
}

/**
 * Resolves standard lesson completion XP reward.
 */
export function getLessonXpReward(customXp?: number): number {
  if (typeof customXp === 'number' && customXp > 0) {
    return Math.round(customXp);
  }
  return LESSON_DEFAULT_XP;
}

/**
 * Resolves course completion milestone XP reward.
 */
export function getCourseCompletionXpReward(customXp?: number): number {
  if (typeof customXp === 'number' && customXp > 0) {
    return Math.round(customXp);
  }
  return COURSE_COMPLETION_MILESTONE_XP;
}

/**
 * Helper to check if two dates fall on the same UTC calendar day.
 */
function isSameUtcDay(d1: Date, d2: Date): boolean {
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

/**
 * Evaluates whether an XP award is eligible against anti-farm deduplication and daily caps.
 */
export function evaluateXpAwardEligibility({
  existingTransactions,
  amount,
  referenceType,
  referenceId,
  now = new Date(),
  dailyCap = DAILY_XP_MAX_CAP,
}: EvaluateXpAwardInput): XpEligibilityResult {
  const safeAmount = Math.max(0, Math.round(Number(amount) || 0));

  if (safeAmount <= 0) {
    return {
      eligible: false,
      grantedAmount: 0,
      skipReason: 'invalid_amount',
      message: 'XP award amount must be greater than zero.',
      todayEarnedXp: 0,
      remainingDailyCap: dailyCap,
    };
  }

  // 1. Anti-Farm Deduplication (XP-once rule for distinct tasks)
  const normRefType = (referenceType || '').trim().toLowerCase();
  const normRefId = (referenceId || '').trim();

  if (normRefType && normRefId) {
    const alreadyAwarded = existingTransactions.some((tx) => {
      const txRefType = (tx.reference_type || '').trim().toLowerCase();
      const txRefId = (tx.reference_id || '').trim();
      const txAmount = Number(tx.amount) || 0;
      return txRefType === normRefType && txRefId === normRefId && txAmount > 0;
    });

    if (alreadyAwarded) {
      return {
        eligible: false,
        grantedAmount: 0,
        skipReason: 'already_awarded',
        message: 'XP has already been awarded for this activity.',
        todayEarnedXp: 0,
        remainingDailyCap: dailyCap,
      };
    }
  }

  // 2. Anti-Farm Daily Cap Verification (UTC calendar day)
  let todayEarnedXp = 0;
  for (const tx of existingTransactions) {
    const txAmount = Number(tx.amount) || 0;
    if (txAmount <= 0) continue;

    const txDate = parseDateInput(tx.created_at);
    if (txDate && isSameUtcDay(txDate, now)) {
      todayEarnedXp += txAmount;
    }
  }

  const remainingDailyCap = Math.max(0, dailyCap - todayEarnedXp);

  if (remainingDailyCap <= 0) {
    return {
      eligible: false,
      grantedAmount: 0,
      skipReason: 'daily_cap_reached',
      message: `Daily limit of ${dailyCap} XP reached. Continue practicing to hone your skills!`,
      todayEarnedXp,
      remainingDailyCap: 0,
    };
  }

  if (safeAmount > remainingDailyCap) {
    return {
      eligible: true,
      grantedAmount: remainingDailyCap,
      skipReason: 'daily_cap_adjusted',
      message: `XP grant adjusted to +${remainingDailyCap} XP to stay within the daily limit.`,
      todayEarnedXp,
      remainingDailyCap: 0,
    };
  }

  return {
    eligible: true,
    grantedAmount: safeAmount,
    skipReason: null,
    message: `Eligible for full +${safeAmount} XP reward.`,
    todayEarnedXp,
    remainingDailyCap: remainingDailyCap - safeAmount,
  };
}
