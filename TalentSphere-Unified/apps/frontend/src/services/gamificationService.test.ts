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

describe('gamificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads leaderboard entries from the canonical leaderboard table', async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [{
        user_id: 'user-1',
        total_xp: 240,
        rank: 3,
        profiles: { full_name: 'Ada Lovelace' },
      }],
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
      data: [{
        id: 'user-badge-1',
        user_id: 'user-1',
        badge_id: 'badge-1',
        earned_at: '2026-06-27T00:00:00.000Z',
        badges: {
          name: 'Fast Starter',
          description: 'Completed the first challenge.',
          icon_url: '/badges/fast-starter.svg',
        },
      }],
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
});
