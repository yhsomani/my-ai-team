import { apiClient } from '../api/axios';

export const settingsService = {
  getNotifications: async (userId: string) => {
    const response = await apiClient.get(`/api/v1/notifications/user/${userId}`);
    return response.data;
  },
  updateNotifications: async (userId: string, settings: any) => {
    // Note: notification-service currently handles individual notifications. 
    // This would be for user preference synchronization.
    const response = await apiClient.put(`/api/v1/users/${userId}`, { preferences: settings });
    return response.data;
  },
  getBilling: async (userId: string) => {
    const response = await apiClient.get(`/api/v1/payments/history/${userId}`);
    return response.data;
  },
  getPlans: async () => {
    const response = await apiClient.get('/api/v1/payments/plans');
    return response.data;
  }
};
