import { apiClient } from '../api/axios';
import { Job } from '../types/job';

export const jobService = {
  getJobs: async (params?: { category?: string; type?: string; search?: string }): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>('/api/v1/jobs', { params });
    return response.data;
  },

  getJobById: async (id: string): Promise<Job> => {
    const response = await apiClient.get<Job>(`/api/v1/jobs/${id}`);
    return response.data;
  },

  getRecommendedJobs: async (userId: string): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>(`/api/v1/jobs/recommended/${userId}`);
    return response.data;
  },

  postJob: async (jobData: Partial<Job>): Promise<Job> => {
    const response = await apiClient.post<Job>('/api/v1/jobs', jobData);
    return response.data;
  },

  searchJobs: async (location: string): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>(`/api/v1/jobs/search`, { params: { location } });
    return response.data;
  }
};
