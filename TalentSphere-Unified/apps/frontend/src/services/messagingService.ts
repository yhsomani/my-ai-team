import { apiClient } from '../api/axios';
import { Message } from '../types/messaging';

export const messagingService = {
  getConversations: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/api/v1/messages/conversations');
    return response.data;
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    const response = await apiClient.get<Message[]>(`/api/v1/messages/conversations/${conversationId}/messages`);
    return response.data;
  },

  sendMessage: async (message: Partial<Message>): Promise<Message> => {
    const response = await apiClient.post<Message>('/api/v1/messages/send', message);
    return response.data;
  }
};
