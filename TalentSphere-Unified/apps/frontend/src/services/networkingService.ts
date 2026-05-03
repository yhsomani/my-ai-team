import { apiClient } from '../api/axios';
import { Connection, FeedItem, PublicProfile } from '../types/networking';

export const networkingService = {
  getFeed: async (): Promise<FeedItem[]> => {
    const response = await apiClient.get<FeedItem[]>('/api/v1/networking/feed');
    return response.data;
  },

  sendConnectionRequest: async (recipientId: string): Promise<Connection> => {
    const response = await apiClient.post<Connection>('/api/v1/networking/connect', { recipientId });
    return response.data;
  },

  getSuggestions: async (): Promise<PublicProfile[]> => {
    const response = await apiClient.get<PublicProfile[]>('/api/v1/networking/suggestions');
    return response.data;
  }
};
