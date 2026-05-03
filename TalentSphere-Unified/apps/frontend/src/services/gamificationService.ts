import { supabase } from '../lib/supabaseClient';

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

    return (data || []).map((entry: any, index: number) => ({
      rank: index + 1,
      user_id: entry.user_id,
      full_name: entry.profiles?.full_name || 'Unknown',
      total_xp: entry.total_xp || 0,
      level: Math.floor(entry.total_xp / 100) + 1,
      badge_count: 0
    }));
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

    return (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      badge_id: item.badge_id,
      badge_name: item.badges?.name || 'Unknown',
      badge_description: item.badges?.description || '',
      badge_icon: item.badges?.icon_url || '',
      earned_at: item.earned_at
    }));
  },

  getUserXP: async (userId: string): Promise<number> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('total_xp')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user XP:', error);
      throw new Error(`Failed to fetch XP: ${error.message}`);
    }

    return data?.total_xp || 0;
  },

  getUserLevel: async (userId: string): Promise<number> => {
    const xp = await gamificationService.getUserXP(userId);
    return Math.floor(xp / 100) + 1;
  },

  getXPTransactions: async (userId: string, limit: number = 20): Promise<any[]> => {
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

    return data || [];
  }
};
