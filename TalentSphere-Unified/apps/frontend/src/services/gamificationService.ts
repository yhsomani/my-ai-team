import { typedSupabase as supabase, type Database } from '../lib/supabaseClient';
import {
  calculateLevel,
  calculateLevelProgress,
  evaluateXpAwardEligibility,
  type LevelProgressInfo,
  type XpSkipReason,
} from '../lib/xpLedger';

export const GAMIFICATION_UPDATED_EVENT = 'talentsphere:gamification-updated';

const emitGamificationChange = (userId: string, detail?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(GAMIFICATION_UPDATED_EVENT, { detail: { userId, ...detail } }));
};

type LeaderboardRow = Database['public']['Tables']['leaderboard']['Row'] & {
  profiles?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

type UserBadgeRow = Database['public']['Tables']['user_badges']['Row'] & {
  badges?: {
    name?: string | null;
    description?: string | null;
    icon_url?: string | null;
  } | null;
};

type XPTransactionRow = Database['public']['Tables']['xp_transactions']['Row'];
export type XPTransaction = XPTransactionRow;

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name: string;
  total_xp: number;
  level: number;
  badge_count: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  earned_at: string;
}

export interface AwardXpInput {
  userId: string;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  now?: Date;
}

export interface XPAwardResult {
  awarded: boolean;
  amount: number;
  previousXP: number;
  newXP: number;
  previousLevel: number;
  newLevel: number;
  didLevelUp: boolean;
  skipReason: XpSkipReason | 'auth_required';
  message: string;
  transactionId?: string;
}

export interface UserGamificationProfile {
  userId: string;
  totalXp: number;
  level: number;
  progress: LevelProgressInfo;
  badges: UserBadge[];
  recentTransactions: XPTransaction[];
}

export const gamificationService = {
  getLeaderboard: async (limit: number = 10): Promise<LeaderboardEntry[]> => {
    const { data, error } = await supabase
      .from('leaderboard')
      .select(`
        user_id,
        total_xp,
        rank,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      throw new Error(`Failed to fetch leaderboard: ${error.message}`);
    }

    return ((data || []) as unknown as LeaderboardRow[]).map((entry, index) => {
      const totalXp = entry.total_xp || 0;

      return {
        rank: entry.rank || index + 1,
        user_id: entry.user_id,
        full_name: entry.profiles?.full_name || 'Unknown',
        total_xp: totalXp,
        level: calculateLevel(totalXp),
        badge_count: 0,
      };
    });
  },

  getUserBadges: async (userId: string): Promise<UserBadge[]> => {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        id,
        user_id,
        badge_id,
        earned_at,
        badges:badge_id (
          name,
          description,
          icon_url
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('Error fetching user badges:', error);
      throw new Error(`Failed to fetch badges: ${error.message}`);
    }

    return ((data || []) as unknown as UserBadgeRow[]).map((item) => ({
      id: item.id,
      user_id: item.user_id,
      badge_id: item.badge_id,
      badge_name: item.badges?.name || 'Unknown',
      badge_description: item.badges?.description || '',
      badge_icon: item.badges?.icon_url || '',
      earned_at: item.earned_at || '',
    }));
  },

  getUserXP: async (userId: string): Promise<number> => {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('total_xp')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user XP:', error);
      throw new Error(`Failed to fetch XP: ${error.message}`);
    }

    return data?.total_xp || 0;
  },

  getUserLevel: async (userId: string): Promise<number> => {
    const xp = await gamificationService.getUserXP(userId);
    return calculateLevel(xp);
  },

  getXPTransactions: async (userId: string, limit: number = 20): Promise<XPTransaction[]> => {
    const { data, error } = await supabase
      .from('xp_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching XP transactions:', error);
      throw new Error(`Failed to fetch XP transactions: ${error.message}`);
    }

    return (data || []) as XPTransactionRow[];
  },

  /**
   * Awards XP to a user with anti-farm validation, transaction ledger recording, and leaderboard synchronization.
   */
  awardXP: async ({
    userId,
    amount,
    reason,
    referenceType,
    referenceId,
    now = new Date(),
  }: AwardXpInput): Promise<XPAwardResult> => {
    if (!userId) {
      return {
        awarded: false,
        amount: 0,
        previousXP: 0,
        newXP: 0,
        previousLevel: 1,
        newLevel: 1,
        didLevelUp: false,
        skipReason: 'auth_required',
        message: 'Sign in to earn and record XP.',
      };
    }

    // 1. Fetch user's existing transactions to check anti-farm rules
    const existingTransactions = await gamificationService.getXPTransactions(userId, 100);

    // 2. Evaluate eligibility against XP-once and daily cap rules
    const eligibility = evaluateXpAwardEligibility({
      existingTransactions,
      amount,
      referenceType,
      referenceId,
      now,
    });

    // 3. Fetch current user XP from leaderboard
    const previousXP = await gamificationService.getUserXP(userId);
    const previousLevel = calculateLevel(previousXP);

    if (!eligibility.eligible || eligibility.grantedAmount <= 0) {
      return {
        awarded: false,
        amount: 0,
        previousXP,
        newXP: previousXP,
        previousLevel,
        newLevel: previousLevel,
        didLevelUp: false,
        skipReason: eligibility.skipReason,
        message: eligibility.message,
      };
    }

    const grantedAmount = eligibility.grantedAmount;
    const newXP = previousXP + grantedAmount;
    const newLevel = calculateLevel(newXP);
    const didLevelUp = newLevel > previousLevel;

    // 4. Record transaction in canonical xp_transactions table
    const { data: txData, error: txError } = await supabase
      .from('xp_transactions')
      .insert({
        user_id: userId,
        amount: grantedAmount,
        reason: reason.trim() || 'Activity completed',
        reference_type: referenceType || null,
        reference_id: referenceId || null,
        created_at: now.toISOString(),
      })
      .select()
      .maybeSingle();

    if (txError) {
      console.error('Failed to insert XP transaction:', txError);
      throw new Error(`Failed to record XP transaction: ${txError.message}`);
    }

    // 5. Update/Upsert user leaderboard record
    const { error: leaderboardError } = await supabase
      .from('leaderboard')
      .upsert(
        {
          user_id: userId,
          total_xp: newXP,
        },
        { onConflict: 'user_id' }
      );

    if (leaderboardError) {
      console.warn('Leaderboard update encountered an issue:', leaderboardError);
    }

    emitGamificationChange(userId, {
      amount: grantedAmount,
      previousXP,
      newXP,
      previousLevel,
      newLevel,
      didLevelUp,
    });

    return {
      awarded: true,
      amount: grantedAmount,
      previousXP,
      newXP,
      previousLevel,
      newLevel,
      didLevelUp,
      skipReason: eligibility.skipReason,
      message: eligibility.message,
      transactionId: (txData as any)?.id,
    };
  },

  /**
   * Fetches unified gamification profile for user including XP, level, progress, badges, and transactions.
   */
  getUserGamificationProfile: async (userId: string): Promise<UserGamificationProfile> => {
    if (!userId) {
      const defaultProgress = calculateLevelProgress(0);
      return {
        userId: '',
        totalXp: 0,
        level: 1,
        progress: defaultProgress,
        badges: [],
        recentTransactions: [],
      };
    }

    try {
      const [totalXp, badges, recentTransactions] = await Promise.all([
        gamificationService.getUserXP(userId).catch(() => 0),
        gamificationService.getUserBadges(userId).catch(() => []),
        gamificationService.getXPTransactions(userId, 10).catch(() => []),
      ]);

      const level = calculateLevel(totalXp);
      const progress = calculateLevelProgress(totalXp);

      return {
        userId,
        totalXp,
        level,
        progress,
        badges,
        recentTransactions,
      };
    } catch (error) {
      console.error('Failed to load gamification profile:', error);
      const fallbackProgress = calculateLevelProgress(0);
      return {
        userId,
        totalXp: 0,
        level: 1,
        progress: fallbackProgress,
        badges: [],
        recentTransactions: [],
      };
    }
  },
};
