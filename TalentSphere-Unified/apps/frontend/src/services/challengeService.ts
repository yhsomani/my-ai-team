import { apiClient } from '../api/axios';
import { Challenge } from '../types/challenges';

export const challengeService = {
  getChallenges: async (isActive?: boolean): Promise<Challenge[]> => {
    const response = await apiClient.get<Challenge[]>('/api/v1/challenges', { params: { isActive } });
    return response.data;
  },

  submitChallengeSolution: async (challengeId: string, userId: string, language: string, code: string): Promise<any> => {
    const response = await apiClient.post<any>(`/api/v1/challenges/submit`, code, { 
      params: { challengeId, userId, language },
      headers: { 'Content-Type': 'text/plain' }
    });
    return response.data;
  }
};
