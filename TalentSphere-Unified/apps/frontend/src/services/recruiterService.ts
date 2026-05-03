import apiClient from '../api/axios';

export interface RecruiterStats {
  activeJobs: number;
  totalApplications: number;
  newApplications: number;
  hiredCount: number;
}

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  status: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED' | string;
  appliedAt: string;
  user?: {
    fullName: string;
    email: string;
  };
  job?: {
    title: string;
  };
  resumeUrl?: string;
}

export const recruiterService = {
  getStats: async (): Promise<RecruiterStats> => {
    const response = await apiClient.get<any, { data: RecruiterStats }>('/api/v1/recruiter/stats');
    return response.data;
  },

  getRecentApplications: async (): Promise<Application[]> => {
    const response = await apiClient.get<any, { data: Application[] }>('/api/v1/recruiter/applications/recent');
    return response.data;
  },

  getAllApplications: async (jobId?: string): Promise<Application[]> => {
    const url = jobId
      ? `/api/v1/applications/job/${jobId}`
      : '/api/v1/applications';
    const response = await apiClient.get<any, { data: Application[] }>(url);
    return response.data;
  },

  getRecruiterJobs: async (): Promise<any[]> => {
    const response = await apiClient.get<any, { data: any[] }>('/api/v1/recruiter/jobs');
    return response.data;
  },

  updateApplicationStatus: async (applicationId: string, status: string): Promise<Application> => {
    const response = await apiClient.patch<any, { data: Application }>(
      `/api/v1/applications/${applicationId}/status`,
      { status }
    );
    return response.data;
  },
};
