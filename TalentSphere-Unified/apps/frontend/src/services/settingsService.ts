import { apiClient } from '../api/axios';

export const settingsService = {
  getNotifications: async (userId: string) => {
    const response = await apiClient.get(`/api/v1/settings/notifications/${userId}`);
    return response.data;
  },
  updateNotifications: async (userId: string, settings: any) => {
    const response = await apiClient.put(`/api/v1/settings/notifications/${userId}`, settings);
    return response.data;
  },
  getBilling: async (userId: string) => {
    const response = await apiClient.get(`/api/v1/settings/billing/${userId}`);
    return response.data;
  }
};
