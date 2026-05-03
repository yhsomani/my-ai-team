import { apiClient } from '../api/axios';
import type { Resume } from '../types/profile';

export const profileService = {
  getProfile: async (userId: string) => {
    const response = await apiClient.get<any, { data: any }>(`/api/v1/profile/${userId}`);
    return response.data;
  },

  updateProfile: async (userId: string, profile: any) => {
    const response = await apiClient.put<any, { data: any }>(`/api/v1/profile/${userId}`, profile);
    return response.data;
  },

  getSkills: async (userId: string) => {
    const response = await apiClient.get<any, { data: any[] }>(`/api/v1/profile/${userId}/skills`);
    return response.data;
  },

  addSkill: async (userId: string, skill: any) => {
    const response = await apiClient.post<any, { data: any }>(`/api/v1/profile/${userId}/skills`, skill);
    return response.data;
  },

  saveResume: async (resume: Resume) => {
    const response = await apiClient.post<Resume, { data: Resume }>(`/api/v1/profile/resume`, resume);
    return response.data;
  },

  getResume: async (userId: string) => {
    const response = await apiClient.get<Resume, { data: Resume }>(`/api/v1/profile/${userId}/resume`);
    return response.data;
  }
};
