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

export interface DashboardOnboardingSignals {
  hasProfileDetails: boolean;
  skillCount: number;
  applicationCount: number;
  savedSearchCount: number;
  enrollmentCount: number;
  challengeSubmissionCount: number;
}

export interface DashboardData {
  stats: DashboardStats;
  jobs: any[];
  challenges: any[];
  onboarding: DashboardOnboardingSignals;
  meta: {
    fetchedAt: string;
    source: 'live' | 'partial';
    issues: string[];
  };
}

const getSettledIssue = (label: string, result: PromiseSettledResult<any>) => {
  if (result.status === 'rejected') {
    return `${label} did not refresh.`;
  }

  if (result.value?.error) {
    return `${label} did not refresh: ${result.value.error.message || 'Unknown error'}.`;
  }

  return null;
};

const getSettledData = (result: PromiseSettledResult<any>) => (
  result.status === 'fulfilled' && !result.value?.error ? result.value.data : null
);

const getSettledCount = (result: PromiseSettledResult<any>) => (
  result.status === 'fulfilled' && !result.value?.error ? result.value.count || 0 : 0
);

const defaultOnboardingSignals: DashboardOnboardingSignals = {
  hasProfileDetails: false,
  skillCount: 0,
  applicationCount: 0,
  savedSearchCount: 0,
  enrollmentCount: 0,
  challengeSubmissionCount: 0
};

const getProfileSignal = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select(`
      headline,
      current_role,
      summary,
      location,
      skills (name)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { hasProfileDetails: false, skillCount: 0 };
  }

  return {
    hasProfileDetails: Boolean(data.headline || data.current_role || data.summary || data.location),
    skillCount: Array.isArray(data.skills) ? data.skills.length : 0
  };
};

const getSafeCount = async (table: string, column: string, value: string) => {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(column, value);

  if (error) {
    console.warn(`[Dashboard] ${table} onboarding signal unavailable.`, error);
    return 0;
  }

  return count || 0;
};

const getOnboardingSignals = async (userId: string, applicationCount: number): Promise<DashboardOnboardingSignals> => {
  const [
    profileSignal,
    savedSearchCount,
    enrollmentCount,
    challengeSubmissionCount
  ] = await Promise.all([
    getProfileSignal(userId).catch(() => ({ hasProfileDetails: false, skillCount: 0 })),
    getSafeCount('saved_job_searches', 'user_id', userId),
    getSafeCount('enrollments', 'user_id', userId),
    getSafeCount('challenge_submissions', 'user_id', userId)
  ]);

  return {
    ...defaultOnboardingSignals,
    hasProfileDetails: profileSignal.hasProfileDetails,
    skillCount: profileSignal.skillCount,
    applicationCount,
    savedSearchCount,
    enrollmentCount,
    challengeSubmissionCount
  };
};

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
          
          if (convResult.error || !convResult.data) return { count: 0, error: convResult.error };
          
          const conversationIds = convResult.data.map(c => c.conversation_id);
          if (conversationIds.length === 0) return { count: 0 };
          
          // Then count unread messages in those conversations
          const msgResult = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', conversationIds)
            .neq('sender_id', userId)
            .is('read_at', null);
          
          if (msgResult.error) return { count: 0, error: msgResult.error };
          return { count: msgResult.count || 0 };
        })()
      ]);

      const leaderboard = getSettledData(leaderboardData);
      const issues = [
        getSettledIssue('XP and level', leaderboardData),
        getSettledIssue('Application count', appCountData),
        getSettledIssue('Recent opportunities', jobsData),
        getSettledIssue('Active challenges', challengesData),
        getSettledIssue('Unread messages', messagesData)
      ].filter(Boolean) as string[];

      const stats: DashboardStats = {
        xp: leaderboard?.total_xp || 0,
        level: Math.floor((leaderboard?.total_xp || 0) / 100) + 1,
        applications: getSettledCount(appCountData),
        messages: getSettledCount(messagesData),
        xpTrend: '+0',
        appsTrend: 'STABLE',
        msgTrend: getSettledCount(messagesData) > 0 ? 'NEW' : 'NONE'
      };
      const onboarding = await getOnboardingSignals(userId, stats.applications);

      const data = {
        stats,
        jobs: getSettledData(jobsData) || [],
        challenges: getSettledData(challengesData) || [],
        onboarding,
        meta: {
          fetchedAt: new Date().toISOString(),
          source: issues.length > 0 ? 'partial' as const : 'live' as const,
          issues
        }
      };

      return data;
    } catch (err: any) {
      console.error("Dashboard data fetch error:", err);
      throw new Error("Failed to load dashboard data.");
    }
  }
};
