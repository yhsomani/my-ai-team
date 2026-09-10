import { beforeEach, describe, expect, it, vi } from 'vitest';
import { typedSupabase } from '../lib/supabaseClient';
import { gamificationService } from './gamificationService';

vi.mock('../lib/supabaseClient', () => {
  const client = {
    from: vi.fn(),
  };

  return {
    supabase: client,
    typedSupabase: client,
  };
});

describe('gamificationService (R-06 / QC-8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads leaderboard entries from the canonical leaderboard table', async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [
        {
          user_id: 'user-1',
          total_xp: 240,
          rank: 3,
          profiles: { full_name: 'Ada Lovelace' },
        },
      ],
      error: null,
    });
    const order = vi.fn().mockReturnValue({ limit });
    const select = vi.fn().mockReturnValue({ order });
    (typedSupabase.from as any).mockReturnValue({ select });

    const leaderboard = await gamificationService.getLeaderboard(5);

    expect(typedSupabase.from).toHaveBeenCalledWith('leaderboard');
    expect(select).toHaveBeenCalledWith(expect.stringContaining('rank'));
    expect(order).toHaveBeenCalledWith('total_xp', { ascending: false });
    expect(limit).toHaveBeenCalledWith(5);
    expect(leaderboard[0]).toMatchObject({
      rank: 3,
      user_id: 'user-1',
      full_name: 'Ada Lovelace',
      total_xp: 240,
      level: 3,
    });
  });

  it('reads user XP from leaderboard total_xp instead of profiles', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { total_xp: 450 },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    (typedSupabase.from as any).mockReturnValue({ select });

    const xp = await gamificationService.getUserXP('user-1');

    expect(typedSupabase.from).toHaveBeenCalledWith('leaderboard');
    expect(select).toHaveBeenCalledWith('total_xp');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(xp).toBe(450);
  });

  it('maps user badges through the canonical badges relation fields', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'user-badge-1',
          user_id: 'user-1',
          badge_id: 'badge-1',
          earned_at: '2026-06-27T00:00:00.000Z',
          badges: {
            name: 'Fast Starter',
            description: 'Completed the first challenge.',
            icon_url: '/badges/fast-starter.svg',
          },
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    (typedSupabase.from as any).mockReturnValue({ select });

    const badges = await gamificationService.getUserBadges('user-1');

    expect(typedSupabase.from).toHaveBeenCalledWith('user_badges');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(order).toHaveBeenCalledWith('earned_at', { ascending: false });
    expect(badges[0]).toMatchObject({
      id: 'user-badge-1',
      badge_name: 'Fast Starter',
      badge_icon: '/badges/fast-starter.svg',
    });
  });

  describe('awardXP', () => {
    it('returns auth_required when userId is missing', async () => {
      const result = await gamificationService.awardXP({
        userId: '',
        amount: 50,
        reason: 'Completed challenge',
      });

      expect(result.awarded).toBe(false);
      expect(result.skipReason).toBe('auth_required');
      expect(result.message).toContain('Sign in');
    });

    it('awards XP, records transaction, upserts leaderboard, and computes level up', async () => {
      const fixedNow = new Date('2026-08-30T10:00:00.000Z');

      // 1. Mock getXPTransactions (empty initially)
      const txLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const txOrder = vi.fn().mockReturnValue({ limit: txLimit });
      const txEq = vi.fn().mockReturnValue({ order: txOrder });
      const txSelect = vi.fn().mockReturnValue({ eq: txEq });

      // 2. Mock getUserXP (currently 80 XP -> Level 1)
      const lbMaybeSingle = vi.fn().mockResolvedValue({
        data: { total_xp: 80 },
        error: null,
      });
      const lbEq = vi.fn().mockReturnValue({ maybeSingle: lbMaybeSingle });
      const lbSelect = vi.fn().mockReturnValue({ eq: lbEq });

      // 3. Mock insert into xp_transactions
      const insertMaybeSingle = vi.fn().mockResolvedValue({
        data: { id: 'tx-new-123' },
        error: null,
      });
      const insertSelect = vi.fn().mockReturnValue({ maybeSingle: insertMaybeSingle });
      const insert = vi.fn().mockReturnValue({ select: insertSelect });

      // 4. Mock upsert into leaderboard
      const upsert = vi.fn().mockResolvedValue({ error: null });

      (typedSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'xp_transactions') {
          return {
            select: txSelect,
            insert,
          };
        }
        if (table === 'leaderboard') {
          return {
            select: lbSelect,
            upsert,
          };
        }
        return {};
      });

      const result = await gamificationService.awardXP({
        userId: 'user-1',
        amount: 50, // 80 + 50 = 130 XP -> Level 2
        reason: 'Completed challenge: Array Reverser',
        referenceType: 'challenge',
        referenceId: 'ch-array-1',
        now: fixedNow,
      });

      expect(result.awarded).toBe(true);
      expect(result.amount).toBe(50);
      expect(result.previousXP).toBe(80);
      expect(result.newXP).toBe(130);
      expect(result.previousLevel).toBe(1);
      expect(result.newLevel).toBe(2);
      expect(result.didLevelUp).toBe(true);
      expect(result.transactionId).toBe('tx-new-123');

      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          amount: 50,
          reason: 'Completed challenge: Array Reverser',
          reference_type: 'challenge',
          reference_id: 'ch-array-1',
        })
      );

      expect(upsert).toHaveBeenCalledWith(
        {
          user_id: 'user-1',
          total_xp: 130,
        },
        { onConflict: 'user_id' }
      );
    });

    it('enforces anti-farm deduplication if challenge reference was already awarded', async () => {
      const fixedNow = new Date('2026-08-30T10:00:00.000Z');

      // Mock existing transaction with same reference
      const txLimit = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'tx-old-1',
            user_id: 'user-1',
            amount: 50,
            reference_type: 'challenge',
            reference_id: 'ch-array-1',
            created_at: '2026-08-28T09:00:00.000Z',
          },
        ],
        error: null,
      });
      const txOrder = vi.fn().mockReturnValue({ limit: txLimit });
      const txEq = vi.fn().mockReturnValue({ order: txOrder });
      const txSelect = vi.fn().mockReturnValue({ eq: txEq });

      // Mock user XP
      const lbMaybeSingle = vi.fn().mockResolvedValue({
        data: { total_xp: 150 },
        error: null,
      });
      const lbEq = vi.fn().mockReturnValue({ maybeSingle: lbMaybeSingle });
      const lbSelect = vi.fn().mockReturnValue({ eq: lbEq });

      (typedSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'xp_transactions') {
          return { select: txSelect };
        }
        if (table === 'leaderboard') {
          return { select: lbSelect };
        }
        return {};
      });

      const result = await gamificationService.awardXP({
        userId: 'user-1',
        amount: 50,
        reason: 'Completed challenge: Array Reverser',
        referenceType: 'challenge',
        referenceId: 'ch-array-1',
        now: fixedNow,
      });

      expect(result.awarded).toBe(false);
      expect(result.skipReason).toBe('already_awarded');
      expect(result.previousXP).toBe(150);
      expect(result.newXP).toBe(150);
      expect(result.didLevelUp).toBe(false);
    });
  });

  describe('getUserGamificationProfile', () => {
    it('aggregates XP, level, progress, badges, and recent transactions', async () => {
      // Mock leaderboard
      const lbMaybeSingle = vi.fn().mockResolvedValue({
        data: { total_xp: 340 },
        error: null,
      });
      const lbEq = vi.fn().mockReturnValue({ maybeSingle: lbMaybeSingle });
      const lbSelect = vi.fn().mockReturnValue({ eq: lbEq });

      // Mock badges
      const badgesOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'ub-1',
            user_id: 'user-1',
            badge_id: 'b-1',
            earned_at: '2026-08-20T00:00:00.000Z',
            badges: { name: 'Code Ninja', description: 'Solved 10 challenges', icon_url: '/ninja.png' },
          },
        ],
        error: null,
      });
      const badgesEq = vi.fn().mockReturnValue({ order: badgesOrder });
      const badgesSelect = vi.fn().mockReturnValue({ eq: badgesEq });

      // Mock transactions
      const txLimit = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'tx-1',
            user_id: 'user-1',
            amount: 50,
            reason: 'Challenge completion',
            created_at: '2026-08-30T00:00:00.000Z',
          },
        ],
        error: null,
      });
      const txOrder = vi.fn().mockReturnValue({ limit: txLimit });
      const txEq = vi.fn().mockReturnValue({ order: txOrder });
      const txSelect = vi.fn().mockReturnValue({ eq: txEq });

      (typedSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'leaderboard') return { select: lbSelect };
        if (table === 'user_badges') return { select: badgesSelect };
        if (table === 'xp_transactions') return { select: txSelect };
        return {};
      });

      const profile = await gamificationService.getUserGamificationProfile('user-1');

      expect(profile.userId).toBe('user-1');
      expect(profile.totalXp).toBe(340);
      expect(profile.level).toBe(4);
      expect(profile.progress.progressPercentage).toBe(40);
      expect(profile.badges).toHaveLength(1);
      expect(profile.badges[0].badge_name).toBe('Code Ninja');
      expect(profile.recentTransactions).toHaveLength(1);
    });

    it('returns empty fallback profile for empty userId', async () => {
      const profile = await gamificationService.getUserGamificationProfile('');

      expect(profile.userId).toBe('');
      expect(profile.totalXp).toBe(0);
      expect(profile.level).toBe(1);
      expect(profile.progress.progressPercentage).toBe(0);
      expect(profile.badges).toEqual([]);
      expect(profile.recentTransactions).toEqual([]);
    });
  });
});
