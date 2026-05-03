import apiClient from '../api/axios';

const isTesting = () => typeof window !== 'undefined' && (window as any).__E2E_TESTING__;

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
      // Parallel fetch through the Gateway (Nginx)
      const [xpRes, appCountRes, jobsRes, challengesRes, msgRes] = await Promise.allSettled([
        apiClient.get(`/api/v1/gamification/stats/${userId}`),
        apiClient.get(`/api/v1/applications/count/${userId}`),
        apiClient.get('/api/v1/jobs/recommended'),
        apiClient.get('/api/v1/challenges/trending'),
        apiClient.get(`/api/v1/messages/unread/count/${userId}`)
      ]);

      const stats: DashboardStats = {
        xp: xpRes.status === 'fulfilled' ? (xpRes.value as any).data.xp : 0,
        level: xpRes.status === 'fulfilled' ? (xpRes.value as any).data.level : 1,
        applications: appCountRes.status === 'fulfilled' ? (appCountRes.value as any).data.count : 0,
        messages: msgRes.status === 'fulfilled' ? (msgRes.value as any).data.count : 0,
        xpTrend: xpRes.status === 'fulfilled' ? (xpRes.value as any).data.xpTrend : '+0',
        appsTrend: 'STABLE',
        msgTrend: msgRes.status === 'fulfilled' && (msgRes.value as any).data.count > 0 ? 'NEW' : 'NONE'
      };

      const data = {
        stats,
        jobs: jobsRes.status === 'fulfilled' ? (jobsRes.value as any).data : [],
        challenges: challengesRes.status === 'fulfilled' ? (challengesRes.value as any).data : []
      };

      return data;
    } catch (err: any) {
      console.error("Dashboard isolation breach:", err);
      throw new Error("Failed to synchronize dashboard state.");
    }
  }
};
