import { apiClient } from '../api/axios';

export const gamificationService = {
  getLeaderboard: async () => {
    const response = await apiClient.get<any, { data: any[] }>('/api/v1/gamification/leaderboard');
    return response.data;
  },

  getAchievements: async (userId: string) => {
    const response = await apiClient.get<any, { data: any[] }>(`/api/v1/gamification/achievements/${userId}`);
    return response.data;
  }
};
