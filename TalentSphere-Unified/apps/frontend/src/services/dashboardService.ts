import { supabase } from '../lib/supabaseClient';

export interface DashboardStats {
  xp: number;
  level: number;
  applications: number;
  messages: number;
  xpTrend?: string;
  appsTrend?: string;
  msgTrend?: string;
}

export interface DashboardData {
    stats: DashboardStats;
    jobs: any[];
    challenges: any[];
}

export const dashboardService = {
  fetchDashboardData: async (userId: string): Promise<DashboardData> => {
    try {
      // Parallel fetch from Supabase tables
      const [
        leaderboardData, 
        appCountData, 
        jobsData, 
        challengesData, 
        messagesData
      ] = await Promise.allSettled([
        // Get XP and level from leaderboard or user_profiles
        supabase
          .from('leaderboard')
          .select('total_xp, rank')
          .eq('user_id', userId)
          .single(),
        
        // Count job applications
        supabase
          .from('job_applications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        // Get recommended jobs
        supabase
          .from('jobs')
          .select(`
            *,
            companies (id, name, logo_url)
          `)
          .eq('status', 'PUBLISHED')
          .order('posted_at', { ascending: false })
          .limit(5),
        
        // Get trending challenges
        supabase
          .from('challenges')
          .select('*')
          .eq('is_published', true)
          .order('xp_reward', { ascending: false })
          .limit(5),
        
        // Count unread messages
        (async () => {
          // First get conversation IDs for the user
          const convResult = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', userId);
          
          if (convResult.error || !convResult.data) return { count: 0 };
          
          const conversationIds = convResult.data.map(c => c.conversation_id);
          if (conversationIds.length === 0) return { count: 0 };
          
          // Then count unread messages in those conversations
          const msgResult = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', conversationIds)
            .is('read_at', null);
          
          return { count: msgResult.count || 0 };
        })()
      ]);

      const stats: DashboardStats = {
        xp: leaderboardData.status === 'fulfilled' ? (leaderboardData.value.data?.total_xp || 0) : 0,
        level: leaderboardData.status === 'fulfilled' ? Math.floor((leaderboardData.value.data?.total_xp || 0) / 100) + 1 : 1,
        applications: appCountData.status === 'fulfilled' ? appCountData.value.count || 0 : 0,
        messages: messagesData.status === 'fulfilled' ? messagesData.value.count || 0 : 0,
        xpTrend: '+0',
        appsTrend: 'STABLE',
        msgTrend: messagesData.status === 'fulfilled' && (messagesData.value.count || 0) > 0 ? 'NEW' : 'NONE'
      };

      const data = {
        stats,
        jobs: jobsData.status === 'fulfilled' ? (jobsData.value.data || []) : [],
        challenges: challengesData.status === 'fulfilled' ? (challengesData.value.data || []) : []
      };

      return data;
    } catch (err: any) {
      console.error("Dashboard data fetch error:", err);
      throw new Error("Failed to load dashboard data.");
    }
  }
};
