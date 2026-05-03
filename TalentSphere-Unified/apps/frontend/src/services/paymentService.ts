import { apiClient } from '../api/axios';

export const paymentService = {
  createSession: async (userId: string, amount: number, currency: string, description: string) => {
    const response = await apiClient.post('/api/v1/payments/checkout', { userId, amount, currency, description });
    return response.data;
  },

  getStatus: async (sessionId: string) => {
    const response = await apiClient.get(`/api/v1/payments/status/${sessionId}`);
    return response.data;
  },

  getHistory: async (userId: string) => {
    const response = await apiClient.get(`/api/v1/payments/history/${userId}`);
    return response.data;
  },

  getPlans: async () => {
    const response = await apiClient.get('/api/v1/payments/plans');
    return response.data;
  }
};
