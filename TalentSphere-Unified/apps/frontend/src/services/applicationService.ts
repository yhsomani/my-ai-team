import { apiClient } from '../api/axios';
import { JobApplication, CreateApplicationRequest } from '../types/job';

export const applicationService = {
  submitApplication: async (request: CreateApplicationRequest & { userId: string }): Promise<JobApplication> => {
    const response = await apiClient.post<JobApplication>('/api/v1/applications', request);
    return response.data;
  },

  getUserApplications: async (userId: string): Promise<JobApplication[]> => {
    const response = await apiClient.get<JobApplication[]>(`/api/v1/applications/user/${userId}`);
    return response.data;
  }
};
